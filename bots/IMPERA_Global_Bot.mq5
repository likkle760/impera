//+------------------------------------------------------------------+
//|                                         IMPERA_AI_Diamond_Bot.mq5   |
//|                        Copyright 2026, IMPERA AI - Premium Trading   |
//|                                         https://impera.com        |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, IMPERA AI"
#property link      "https://impera.com"
#property version   "4.00"
#property strict

#include <Trade\Trade.mqh>

input group "=== IMPERA AI Diamond Bot — VIP ==="
input string   InpLicenceKey   = "IMPERA-XXXX-XXXX-XXXX";  // Licence Key
input int      InpMagicNumber  = 202603;                   // Magic Number
input double   InpLotSize      = 0.10;                     // Lot Size
input int      InpMaxSpread    = 20;                       // Max Spread (points)
input int      InpSlPips       = 30;                       // Stop Loss (pips)
input int      InpTpPips       = 45;                       // Take Profit (pips)
input int      InpMaxTrades    = 5;                        // Max Concurrent Trades
input bool     InpUse trailing  = true;                     // Use Trailing Stop
input int      InpTrailStart   = 20;                       // Trailing Start (pips)
input int      InpTrailStep    = 8;                        // Trailing Step (pips)

input group "=== Strategy Selection ==="
input bool     InpUseScalping  = true;                     // Enable Scalping Strategy
input bool     InpUseSwing     = true;                     // Enable Swing Strategy
input bool     InpUseBreakout  = true;                     // Enable Breakout Strategy

input group "=== Session Filters ==="
input int      InpStartHour    = 7;                        // Trading Start Hour
input int      InpEndHour      = 22;                       // Trading End Hour

input group "=== Risk Management ==="
input double   InpRiskPercent  = 1.5;                      // Risk % Per Trade
input double   InpMaxDrawdown  = 10.0;                     // Max Drawdown %
input bool     InpUseDynamicLots = true;                   // Use Dynamic Lot Sizing

CTrade trade;

// Indicator handles
int hEMA_Fast, hEMA_Slow, hEMA_Trend;
int hRSI, hMACD, hATR, hStoch, hBollinger;
int hADX;

//+------------------------------------------------------------------+
int OnInit()
{
   if(!ValidateLicenceKey(InpLicenceKey))
   {
      Print("IMPERA Diamond Bot: Invalid licence key.");
      return(INIT_FAILED);
   }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(15);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   // M15 indicators
   hEMA_Fast  = iMA(_Symbol, PERIOD_M15, 8, 0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow  = iMA(_Symbol, PERIOD_M15, 21, 0, MODE_EMA, PRICE_CLOSE);
   hRSI       = iRSI(_Symbol, PERIOD_M15, 14, PRICE_CLOSE);
   hMACD      = iMACD(_Symbol, PERIOD_M15, 12, 26, 9, PRICE_CLOSE);
   hATR       = iATR(_Symbol, PERIOD_M15, 14);
   hStoch     = iStochastic(_Symbol, PERIOD_M15, 14, 3, 3, MODE_SMA, STO_LOWHIGH);
   hBollinger = iBands(_Symbol, PERIOD_M15, 20, 0, 2.0, PRICE_CLOSE);
   hADX       = iADX(_Symbol, PERIOD_M15, 14);

   // H1 trend filter
   hEMA_Trend = iMA(_Symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE);

   int handles[] = {hEMA_Fast, hEMA_Slow, hRSI, hMACD, hATR, hStoch, hBollinger, hADX, hEMA_Trend};
   for(int i = 0; i < ArraySize(handles); i++)
   {
      if(handles[i] == INVALID_HANDLE)
      {
         Print("IMPERA Diamond Bot: Indicator init failed.");
         return(INIT_FAILED);
      }
   }

   Print("IMPERA Diamond Bot v4.0 initialised. Key: ", InpLicenceKey);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   int handles[] = {hEMA_Fast, hEMA_Slow, hRSI, hMACD, hATR, hStoch, hBollinger, hADX, hEMA_Trend};
   for(int i = 0; i < ArraySize(handles); i++)
      IndicatorRelease(handles[i]);
}

//+------------------------------------------------------------------+
void OnTick()
{
   if(!IsLicenceActive()) return;
   if(!IsTradeAllowed()) return;
   if(IsMaxDrawdownHit()) return;

   ManageOpenTrades();

   // Gather all indicator data
   double emaFast[], emaSlow[], emaTrend[];
   double rsi[];
   double macdMain[], macdSignal[];
   double atr[];
   double stochK[], stochD[];
   double bbUpper[], bbMiddle[], bbLower[];
   double adx[];

   if(CopyBuffer(hEMA_Fast, 0, 0, 3, emaFast) < 3) return;
   if(CopyBuffer(hEMA_Slow, 0, 0, 3, emaSlow) < 3) return;
   if(CopyBuffer(hEMA_Trend, 0, 0, 2, emaTrend) < 2) return;
   if(CopyBuffer(hRSI, 0, 0, 3, rsi) < 3) return;
   if(CopyBuffer(hMACD, 0, 0, 3, macdMain) < 3) return;
   if(CopyBuffer(hMACD, 1, 0, 3, macdSignal) < 3) return;
   if(CopyBuffer(hATR, 0, 0, 2, atr) < 2) return;
   if(CopyBuffer(hStoch, 0, 0, 3, stochK) < 3) return;
   if(CopyBuffer(hStoch, 1, 0, 3, stochD) < 3) return;
   if(CopyBuffer(hBollinger, 1, 0, 2, bbUpper) < 2) return;
   if(CopyBuffer(hBollinger, 2, 0, 2, bbLower) < 2) return;
   if(CopyBuffer(hADX, 0, 0, 2, adx) < 2) return;

   double spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > InpMaxSpread) return;
   if(CountTrades() >= InpMaxTrades) return;

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);

   bool bulliTrend = ask > emaTrend[0];
   bool beariTrend = ask < emaTrend[0];
   bool strongTrend = adx[0] > 25;

   // ====== SCALPING STRATEGY ======
   if(InpUseScalping)
   {
      bool emaCrossUp   = emaFast[1] > emaSlow[1] && emaFast[2] <= emaSlow[2];
      bool emaCrossDown = emaFast[1] < emaSlow[1] && emaFast[2] >= emaSlow[2];
      bool rsiOB = rsi[1] > 70;
      bool rsiOS = rsi[1] < 30;

      double slDist = InpSlPips * _Point * 10;
      double tpDist = InpTpPips * _Point * 10;
      double lot = GetLotSize(slDist);

      if(emaCrossUp && rsiOS && bulliTrend)
      {
         double sl = NormalizeDouble(ask - slDist, digits);
         double tp = NormalizeDouble(ask + tpDist, digits);
         trade.Buy(lot, _Symbol, ask, sl, tp, "IMPERA Diamond Scalp BUY");
      }
      if(emaCrossDown && rsiOB && beariTrend)
      {
         double sl = NormalizeDouble(bid + slDist, digits);
         double tp = NormalizeDouble(bid - tpDist, digits);
         trade.Sell(lot, _Symbol, bid, sl, tp, "IMPERA Diamond Scalp SELL");
      }
   }

   // ====== SWING STRATEGY ======
   if(InpUseSwing && strongTrend)
   {
      bool macdBullCross = macdMain[1] > macdSignal[1] && macdMain[2] <= macdSignal[2];
      bool macdBearCross = macdMain[1] < macdSignal[1] && macdMain[2] >= macdSignal[2];
      bool stochOS = stochK[1] < 30 && stochK[1] > stochD[1];
      bool stochOB = stochK[1] > 70 && stochK[1] < stochD[1];

      double slDist = InpSlPips * 1.5 * _Point * 10;
      double tpDist = InpTpPips * 2.0 * _Point * 10;
      double lot = GetLotSize(slDist);

      if(macdBullCross && stochOS && bulliTrend)
      {
         double sl = NormalizeDouble(ask - slDist, digits);
         double tp = NormalizeDouble(ask + tpDist, digits);
         trade.Buy(lot, _Symbol, ask, sl, tp, "IMPERA Diamond Swing BUY");
      }
      if(macdBearCross && stochOB && beariTrend)
      {
         double sl = NormalizeDouble(bid + slDist, digits);
         double tp = NormalizeDouble(bid - tpDist, digits);
         trade.Sell(lot, _Symbol, bid, sl, tp, "IMPERA Diamond Swing SELL");
      }
   }

   // ====== BREAKOUT STRATEGY ======
   if(InpUseBreakout)
   {
      double close1 = iClose(_Symbol, PERIOD_M15, 1);
      double close2 = iClose(_Symbol, PERIOD_M15, 2);

      // Bull breakout: price closes above upper BB with strong trend
      if(close1 > bbUpper[1] && close2 <= bbUpper[1] && bulliTrend && strongTrend)
      {
         double slDist = atr[0] * 2;
         double tpDist = atr[0] * 3;
         double lot = GetLotSize(slDist);
         double sl = NormalizeDouble(ask - slDist, digits);
         double tp = NormalizeDouble(ask + tpDist, digits);
         trade.Buy(lot, _Symbol, ask, sl, tp, "IMPERA Diamond Breakout BUY");
      }

      // Bear breakout: price closes below lower BB with strong trend
      if(close1 < bbLower[1] && close2 >= bbLower[1] && beariTrend && strongTrend)
      {
         double slDist = atr[0] * 2;
         double tpDist = atr[0] * 3;
         double lot = GetLotSize(slDist);
         double sl = NormalizeDouble(bid + slDist, digits);
         double tp = NormalizeDouble(bid - tpDist, digits);
         trade.Sell(lot, _Symbol, bid, sl, tp, "IMPERA Diamond Breakout SELL");
      }
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
double GetLotSize(double slDistance)
{
   if(!InpUseDynamicLots) return InpLotSize;

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmount = balance * InpRiskPercent / 100.0;
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);

   if(tickValue == 0 || tickSize == 0) return InpLotSize;

   double lot = riskAmount / (slDistance / tickSize * tickValue);
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   lot = MathFloor(lot / stepLot) * stepLot;
   lot = MathMax(lot, minLot);
   lot = MathMin(lot, maxLot);
   return NormalizeDouble(lot, 2);
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
bool IsMaxDrawdownHit()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance == 0) return false;
   double dd = (balance - equity) / balance * 100.0;
   if(dd >= InpMaxDrawdown)
   {
      Print("IMPERA Diamond: Max drawdown hit (", DoubleToString(dd, 1), "%). Trading paused.");
      return true;
   }
   return false;
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
      Print("IMPERA Diamond Bot: Licence verified. All strategies unlocked.");
   }
   else
   {
      Print("IMPERA Diamond Bot: Licence FAILED.");
   }
   checked = true;
   return active;
}
//+------------------------------------------------------------------+
