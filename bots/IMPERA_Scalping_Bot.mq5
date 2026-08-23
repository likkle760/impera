//+------------------------------------------------------------------+
//|                                          IMPERA_AI_Scalping_Bot.mq5 |
//|                        Copyright 2026, IMPERA AI - Premium Trading   |
//|                                         https://impera.com        |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, IMPERA AI"
#property link      "https://impera.com"
#property version   "3.20"
#property strict

#include <Trade\Trade.mqh>

input group "=== IMPERA AI Scalping Bot ==="
input string   InpLicenceKey   = "IMPERA-XXXX-XXXX-XXXX";  // Licence Key
input int      InpMagicNumber  = 202601;                   // Magic Number
input double   InpLotSize      = 0.01;                     // Lot Size
input int      InpMaxSpread    = 15;                       // Max Spread (points)
input int      InpSlPips       = 20;                       // Stop Loss (pips)
input int      InpTpPips       = 15;                       // Take Profit (pips)
input int      InpMaxTrades    = 3;                        // Max Concurrent Trades
input bool     InpUse trailing  = true;                     // Use Trailing Stop
input int      InpTrailStart   = 10;                       // Trailing Start (pips)
input int      InpTrailStep    = 5;                        // Trailing Step (pips)

input group "=== Session Filters ==="
input int      InpStartHour    = 8;                        // Trading Start Hour (Server)
input int      InpEndHour      = 20;                       // Trading End Hour (Server)
input bool     InpTradeMonday  = true;                     // Trade Monday
input bool     InpTradeFriday  = true;                     // Trade Friday

CTrade trade;

int handleEMA_Fast;
int handleEMA_Slow;
int handleRSI;
int handleATR;

//+------------------------------------------------------------------+
int OnInit()
{
   if(!ValidateLicenceKey(InpLicenceKey))
   {
      Print("IMPERA AI: Invalid licence key. Bot will not trade.");
      return(INIT_FAILED);
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(10);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   handleEMA_Fast = iMA(_Symbol, PERIOD_M5, 8, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA_Slow = iMA(_Symbol, PERIOD_M5, 21, 0, MODE_EMA, PRICE_CLOSE);
   handleRSI       = iRSI(_Symbol, PERIOD_M5, 14, PRICE_CLOSE);
   handleATR       = iATR(_Symbol, PERIOD_M5, 14);

   if(handleEMA_Fast == INVALID_HANDLE || handleEMA_Slow == INVALID_HANDLE ||
      handleRSI == INVALID_HANDLE || handleATR == INVALID_HANDLE)
   {
      Print("IMPERA AI: Failed to initialise indicators.");
      return(INIT_FAILED);
   }

   Print("IMPERA AI Scalping Bot initialised. Key: ", InpLicenceKey);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   IndicatorRelease(handleEMA_Fast);
   IndicatorRelease(handleEMA_Slow);
   IndicatorRelease(handleRSI);
   IndicatorRelease(handleATR);
}

//+------------------------------------------------------------------+
void OnTick()
{
   if(!IsLicenceActive()) return;
   if(!IsTradeAllowed()) return;

   ManageOpenTrades();

   double emaFast[], emaSlow[], rsi[], atr[];
   if(CopyBuffer(handleEMA_Fast, 0, 0, 3, emaFast) < 3) return;
   if(CopyBuffer(handleEMA_Slow, 0, 0, 3, emaSlow) < 3) return;
   if(CopyBuffer(handleRSI, 0, 0, 3, rsi) < 3) return;
   if(CopyBuffer(handleATR, 0, 0, 2, atr) < 2) return;

   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > InpMaxSpread) return;

   if(CountTrades() >= InpMaxTrades) return;

   bool crossover      = emaFast[1] > emaSlow[1] && emaFast[2] <= emaSlow[2];
   bool crossunder     = emaFast[1] < emaSlow[1] && emaFast[2] >= emaSlow[2];
   bool rsiOversold    = rsi[1] < 35;
   bool rsiOverbought  = rsi[1] > 65;

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double slDistance = InpSlPips * _Point * 10;
   double tpDistance = InpTpPips * _Point * 10;

   // BUY signal
   if(crossover && rsiOversold)
   {
      double sl = NormalizeDouble(ask - slDistance, digits);
      double tp = NormalizeDouble(ask + tpDistance, digits);
      if(trade.Buy(InpLotSize, _Symbol, ask, sl, tp, "IMPERA Scalp BUY"))
         Print("IMPERA AI: BUY opened @ ", ask, " SL=", sl, " TP=", tp);
   }

   // SELL signal
   if(crossunder && rsiOverbought)
   {
      double sl = NormalizeDouble(bid + slDistance, digits);
      double tp = NormalizeDouble(bid - tpDistance, digits);
      if(trade.Sell(InpLotSize, _Symbol, bid, sl, tp, "IMPERA Scalp SELL"))
         Print("IMPERA AI: SELL opened @ ", bid, " SL=", sl, " TP=", tp);
   }
}

//+------------------------------------------------------------------+
void ManageOpenTrades()
{
   if(!InpUse trailing) return;

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   double trailStart = InpTrailStart * _Point * 10;
   double trailStep  = InpTrailStep * _Point * 10;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      ulong ticket = PositionGetInteger(POSITION_TICKET);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSL = PositionGetDouble(POSITION_SL);
      long posType = PositionGetInteger(POSITION_TYPE);

      if(posType == POSITION_TYPE_BUY)
      {
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         if(bid - openPrice >= trailStart)
         {
            double newSL = NormalizeDouble(bid - trailStep, digits);
            if(newSL > currentSL)
               trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));
         }
      }
      else if(posType == POSITION_TYPE_SELL)
      {
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         if(openPrice - ask >= trailStart)
         {
            double newSL = NormalizeDouble(ask + trailStep, digits);
            if(newSL < currentSL || currentSL == 0)
               trade.PositionModify(ticket, newSL, PositionGetDouble(POSITION_TP));
         }
      }
   }
}

//+------------------------------------------------------------------+
int CountTrades()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!PositionSelectByTicket(PositionGetTicket(i))) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      count++;
   }
   return count;
}

//+------------------------------------------------------------------+
bool IsTradeAllowed()
{
   MqlDateTime dt;
   TimeCurrent(dt);
   if(dt.hour < InpStartHour || dt.hour >= InpEndHour) return false;
   if(dt.day_of_week == 0 || dt.day_of_week == 6) return false;
   if(dt.day_of_week == 1 && !InpTradeMonday) return false;
   if(dt.day_of_week == 5 && !InpTradeFriday) return false;
   return true;
}

//+------------------------------------------------------------------+
bool ValidateLicenceKey(string key)
{
   if(StringLen(key) != 21) return false;
   if(StringFind(key, "IMPERA-", 0) != 0) return false;
   return true;
}

//+------------------------------------------------------------------+
bool IsLicenceActive()
{
   static bool checked = false;
   static bool active = false;
   if(checked) return active;

   if(StringLen(InpLicenceKey) == 21 && StringFind(InpLicenceKey, "IMPERA-") == 0)
   {
      active = true;
      Print("IMPERA AI: Licence verified successfully.");
   }
   else
   {
      Print("IMPERA AI: Licence verification FAILED. Enter a valid key in settings.");
   }
   checked = true;
   return active;
}
//+------------------------------------------------------------------+
