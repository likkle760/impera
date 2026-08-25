//+------------------------------------------------------------------+
//|                                            IMPERA_AI_Gold_Bot.mq5   |
//|                        Copyright 2026, IMPERA AI - Premium Trading   |
//|                                         https://impera.com        |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, IMPERA AI"
#property link      "https://impera.com"
#property version   "3.50"
#property strict

#include <Trade\Trade.mqh>

input group "=== IMPERA AI Gold Bot ==="
input string   InpLicenceKey   = "IMPERA-XXXX-XXXX-XXXX";  // Licence Key
input int      InpMagicNumber  = 202602;                   // Magic Number
input double   InpLotSize      = 0.05;                     // Lot Size
input int      InpMaxSpread    = 30;                       // Max Spread (points)
input int      InpSlPips       = 50;                       // Stop Loss (pips)
input int      InpTpPips       = 80;                       // Take Profit (pips)
input int      InpMaxTrades    = 2;                        // Max Concurrent Trades
input bool     InpUse trailing  = true;                     // Use Trailing Stop
input int      InpTrailStart   = 30;                       // Trailing Start (pips)
input int      InpTrailStep    = 10;                       // Trailing Step (pips)

input group "=== Session Filters ==="
input int      InpStartHour    = 7;                        // Trading Start Hour
input int      InpEndHour      = 21;                       // Trading End Hour

input group "=== Risk Management ==="
input double   InpRiskPercent  = 2.0;                      // Risk % Per Trade
input bool     InpUseDynamicLots = false;                  // Use Dynamic Lot Sizing

CTrade trade;

int handleEMA_Fast;
int handleEMA_Slow;
int handleEMA_Trend;
int handleMACD;
int handleATR;
int handleStoch;

//+------------------------------------------------------------------+
int OnInit()
{
   if(!ValidateLicenceKey(InpLicenceKey))
   {
      Print("IMPERA Gold Bot: Invalid licence key.");
      return(INIT_FAILED);
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(20);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   // Multi-timeframe indicators for gold
   handleEMA_Fast  = iMA(_Symbol, PERIOD_M15, 12, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA_Slow  = iMA(_Symbol, PERIOD_M15, 26, 0, MODE_EMA, PRICE_CLOSE);
   handleEMA_Trend = iMA(_Symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE);
   handleMACD      = iMACD(_Symbol, PERIOD_M15, 12, 26, 9, PRICE_CLOSE);
   handleATR       = iATR(_Symbol, PERIOD_M15, 14);
   handleStoch     = iStochastic(_Symbol, PERIOD_M15, 14, 3, 3, MODE_SMA, STO_LOWHIGH);

   if(handleEMA_Fast == INVALID_HANDLE || handleEMA_Slow == INVALID_HANDLE ||
      handleEMA_Trend == INVALID_HANDLE || handleMACD == INVALID_HANDLE ||
      handleATR == INVALID_HANDLE || handleStoch == INVALID_HANDLE)
   {
      Print("IMPERA Gold Bot: Failed to initialise indicators.");
      return(INIT_FAILED);
   }

   Print("IMPERA Gold Bot initialised. Key: ", InpLicenceKey);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   IndicatorRelease(handleEMA_Fast);
   IndicatorRelease(handleEMA_Slow);
   IndicatorRelease(handleEMA_Trend);
   IndicatorRelease(handleMACD);
   IndicatorRelease(handleATR);
   IndicatorRelease(handleStoch);
}

//+------------------------------------------------------------------+
void OnTick()
{
   if(!IsLicenceActive()) return;
   if(!IsTradeAllowed()) return;

   ManageOpenTrades();

   double emaFast[], emaSlow[], emaTrend[];
   double macdMain[], macdSignal[];
   double atr[];
   double stochK[], stochD[];

   if(CopyBuffer(handleEMA_Fast, 0, 0, 3, emaFast) < 3) return;
   if(CopyBuffer(handleEMA_Slow, 0, 0, 3, emaSlow) < 3) return;
   if(CopyBuffer(handleEMA_Trend, 0, 0, 2, emaTrend) < 2) return;
   if(CopyBuffer(handleMACD, 0, 0, 3, macdMain) < 3) return;
   if(CopyBuffer(handleMACD, 1, 0, 3, macdSignal) < 3) return;
   if(CopyBuffer(handleATR, 0, 0, 2, atr) < 2) return;
   if(CopyBuffer(handleStoch, 0, 0, 3, stochK) < 3) return;
   if(CopyBuffer(handleStoch, 1, 0, 3, stochD) < 3) return;

   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > InpMaxSpread) return;
   if(CountTrades() >= InpMaxTrades) return;

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);

   bool bulliTrend = ask > emaTrend[0];
   bool beariTrend = ask < emaTrend[0];

   bool emaCrossUp   = emaFast[1] > emaSlow[1] && emaFast[2] <= emaSlow[2];
   bool emaCrossDown = emaFast[1] < emaSlow[1] && emaFast[2] >= emaSlow[2];

   bool macdBull = macdMain[1] > macdSignal[1] && macdMain[2] <= macdSignal[2];
   bool macdBear = macdMain[1] < macdSignal[1] && macdMain[2] >= macdSignal[2];

   bool stochOversold  = stochK[1] < 25 && stochK[1] > stochD[1];
   bool stochOverbought = stochK[1] > 75 && stochK[1] < stochD[1];

   double slDistance = InpSlPips * _Point * 10;
   double tpDistance = InpTpPips * _Point * 10;

   double lotSize = InpLotSize;
   if(InpUseDynamicLots)
      lotSize = CalculateDynamicLot(slDistance);

   // BUY: EMA cross + MACD confirm + Trend alignment + Stoch oversold
   if(emaCrossUp && macdBull && bulliTrend && stochOversold)
   {
      double sl = NormalizeDouble(ask - slDistance, digits);
      double tp = NormalizeDouble(ask + tpDistance, digits);
      if(trade.Buy(lotSize, _Symbol, ask, sl, tp, "IMPERA Gold BUY"))
         Print("IMPERA Gold: BUY @ ", ask, " SL=", sl, " TP=", tp);
   }

   // SELL: EMA cross + MACD confirm + Trend alignment + Stoch overbought
   if(emaCrossDown && macdBear && beariTrend && stochOverbought)
   {
      double sl = NormalizeDouble(bid + slDistance, digits);
      double tp = NormalizeDouble(bid - tpDistance, digits);
      if(trade.Sell(lotSize, _Symbol, bid, sl, tp, "IMPERA Gold SELL"))
         Print("IMPERA Gold: SELL @ ", bid, " SL=", sl, " TP=", tp);
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
double CalculateDynamicLot(double slDistance)
{
   double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = accountBalance * InpRiskPercent / 100.0;
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);

   if(tickValue == 0 || tickSize == 0) return InpLotSize;

   double lotSize = riskAmount / (slDistance / tickSize * tickValue);
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   lotSize = MathFloor(lotSize / stepLot) * stepLot;
   lotSize = MathMax(lotSize, minLot);
   lotSize = MathMin(lotSize, maxLot);

   return NormalizeDouble(lotSize, 2);
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
      Print("IMPERA Gold Bot: Licence verified.");
   }
   else
   {
      Print("IMPERA Gold Bot: Licence FAILED.");
   }
   checked = true;
   return active;
}
//+------------------------------------------------------------------+
