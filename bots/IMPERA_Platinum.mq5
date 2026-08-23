//+------------------------------------------------------------------+
//|                                                IMPERA_Platinum.mq5 |
//|                          Copyright 2026, IMPERA Platinum AI Engine |
//|                          Quantitative Multi-Confirmation System  |
//+------------------------------------------------------------------+
#property copyright "IMPERA Platinum 2026"
#property link      ""
#property version   "4.00"
#property strict
#property description "IMPERA Platinum - High-Frequency AI Trading Engine"
#property description "License-Protected | Trades Every Candle"
#property description "Optimized for XAUUSD M1/M5/M15"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>
#include <Trade\AccountInfo.mqh>

//+------------------------------------------------------------------+
//| Enumerations                                                     |
//+------------------------------------------------------------------+
enum ENUM_SIGNAL_MODE
{
   MODE_CONSERVATIVE = 0, // Conservative
   MODE_BALANCED     = 1, // Balanced
   MODE_AGGRESSIVE   = 2  // Aggressive
};

enum ENUM_LOT_MODE
{
   LOT_FIXED         = 0, // Fixed Lot
   LOT_RISK_PCT      = 1, // Risk % of Balance
   LOT_BALANCE_SCALE = 2  // Balance Scaling
};

//+------------------------------------------------------------------+
//| INPUT: LICENSE (Always First)                                    |
//+------------------------------------------------------------------+
input group "============================================================"
input group "=== IMPERA PLATINUM - LICENSE KEY (Required) ==="
input group "============================================================"
input string InpLicenseKey = "";  // Enter Your License Key (IMPERA-XXXX-XXXX)

//+------------------------------------------------------------------+
//| INPUT: CORE                                                      |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Core Settings ==="
input int              InpMagicNumber    = 20260721;         // Magic Number
input int              InpSlippage       = 20;               // Max Slippage (points)
input ENUM_SIGNAL_MODE InpSignalMode     = MODE_AGGRESSIVE;    // Signal Mode

//+------------------------------------------------------------------+
//| INPUT: LOT & RISK                                                |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Lot & Risk ==="
input ENUM_LOT_MODE    InpLotMode        = LOT_RISK_PCT;     // Lot Sizing Mode
input double           InpFixedLot       = 0.01;             // Fixed Lot (if Fixed Mode)
input double           InpRiskPercent    = 1.0;              // Risk % per Trade
input double           InpBalanceScaleBase = 1000.0;         // Balance Scale Base $
input double           InpMinLot         = 0.01;             // Min Lot
input double           InpMaxLot         = 5.0;              // Max Lot
input double           InpMaxDailyDD     = 5.0;              // Max Daily Drawdown %
input double           InpMaxTotalDD     = 15.0;             // Max Total Drawdown %
input int              InpMaxPositions   = 5;                // Max Concurrent Positions

//+------------------------------------------------------------------+
//| INPUT: SIGNALS                                                   |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Signal Engine ==="
input int              InpRSIPeriod      = 14;               // RSI Period
input int              InpRSIOverbought  = 70;               // RSI Overbought
input int              InpRSIOversold    = 30;               // RSI Oversold
input int              InpMACDFast       = 12;               // MACD Fast
input int              InpMACDSlow       = 26;               // MACD Slow
input int              InpMACDSignal     = 9;                // MACD Signal
input int              InpBBPeriod       = 20;               // Bollinger Bands Period
input double           InpBBDeviation    = 2.0;              // BB Deviation
input int              InpATRPeriod      = 14;               // ATR Period
input double           InpATRMultiplier  = 1.5;              // ATR Multiplier
input int              InpEMAFast        = 9;                // EMA Fast
input int              InpEMASlow        = 21;               // EMA Slow
input int              InpMinConfirm     = 1;                // Min Confirmations (1-4)

//+------------------------------------------------------------------+
//| INPUT: TRADE MANAGEMENT                                          |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Trade Management ==="
input double           InpTakeProfitPips = 0;                // Take Profit (0=auto ATR)
input double           InpStopLossPips   = 0;                // Stop Loss (0=auto ATR)
input double           InpTPMultiplier   = 1.5;              // TP Multiplier (auto)
input double           InpSLMultiplier   = 1.0;              // SL Multiplier (auto)
input bool             InpUseTrailing    = true;             // Enable Trailing Stop
input double           InpTrailStartPips = 50;               // Trail Start (points)
input double           InpTrailStepPips  = 25;               // Trail Step (points)
input bool             InpUseBreakeven   = true;             // Enable Breakeven
input double           InpBEStartPips    = 40;               // Breakeven Start (points)
input double           InpBEPips         = 10;               // Breakeven Lock (points)

//+------------------------------------------------------------------+
//| INPUT: SPEED & EXECUTION                                         |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Speed & Execution ==="
input bool             InpTickScan       = true;             // Scan Every Tick (fast)
input int              InpCooldownSec   = 5;                // Cooldown Between Trades (sec)
input bool             InpATRFilter     = true;             // ATR Volatility Filter
input double           InpATRMinRatio   = 0.1;              // ATR Min Ratio (lower=faster)
input bool             InpMultiTF       = true;             // Multi-Timeframe Confirm
input ENUM_TIMEFRAMES  InpHTF           = PERIOD_M15;       // Higher Timeframe Filter
input int              InpHTFEMAFast    = 9;                // HTF EMA Fast
input int              InpHTFEMASlow    = 21;               // HTF EMA Slow

//+------------------------------------------------------------------+
//| INPUT: SESSION                                                   |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Session Filter ==="
input bool             InpUseSession     = true;             // Use Session Filter
input int              InpSessionStartH  = 2;                // Session Start Hour
input int              InpSessionEndH    = 22;               // Session End Hour
input bool             InpCloseEOD       = false;            // Close All End of Day

//+------------------------------------------------------------------+
//| INPUT: VISUAL UI                                                 |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Dashboard ==="
input bool             InpShowUI         = true;             // Show Dashboard
input int              InpUIX            = 10;               // Panel X
input int              InpUIY            = 30;               // Panel Y
input color            InpUIColor        = C'15,15,25';      // Panel Background
input color            InpUITextColor    = clrWhite;          // Text Color
input color            InpUIProfitColor  = clrLime;           // Profit Color
input color            InpUILossColor    = clrRed;            // Loss Color
input color            InpUIAccentColor  = C'0,150,255';     // Accent Color

//+------------------------------------------------------------------+
//| INPUT: LOGGING                                                   |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Logging ==="
input bool             InpLogTrades      = true;             // Log Trades
input bool             InpLogSignals     = true;             // Log Signals

//+------------------------------------------------------------------+
//| INPUT: WEB REPORTING                                              |
//+------------------------------------------------------------------+
input group "=== IMPERA Platinum - Web Reporting ==="
input bool             InpWebReport      = true;             // Enable Web Reporting
input string           InpWebURL         = "http://localhost:5000"; // Server URL
input int              InpReportInterval = 30;               // Report Interval (seconds)

//+------------------------------------------------------------------+
//| Global Objects                                                   |
//+------------------------------------------------------------------+
CTrade         trade;
CPositionInfo  posInfo;
CSymbolInfo    symInfo;
CAccountInfo   accInfo;

//+------------------------------------------------------------------+
//| Global State                                                     |
//+------------------------------------------------------------------+
double         g_point           = 0;
int            g_digits          = 0;
string         g_symbol          = "";
double         g_dayStartEquity  = 0;
double         g_peakEquity      = 0;
datetime       g_lastBarTime     = 0;
datetime       g_lastDayTime     = 0;
bool           g_paused          = false;
bool           g_licenseValid    = false;
string         g_licenseKey      = "";
int            g_keyNumber       = 0;
int            g_winTrades       = 0;
int            g_lossTrades      = 0;
double         g_totalProfit     = 0;
double         g_maxDD           = 0;
datetime       g_lastTradeTime   = 0;
datetime       g_lastReportTime  = 0;
double         g_avgWin          = 0;
double         g_avgLoss         = 0;
double         g_profitFactor    = 0;
double         g_winSum          = 0;
double         g_lossSum         = 0;

//--- Indicator handles
int            g_hRSI            = INVALID_HANDLE;
int            g_hMACD           = INVALID_HANDLE;
int            g_hBB             = INVALID_HANDLE;
int            g_hATR            = INVALID_HANDLE;
int            g_hEMAFast        = INVALID_HANDLE;
int            g_hEMASlow        = INVALID_HANDLE;
int            g_hHTFEMAFast     = INVALID_HANDLE;
int            g_hHTFEMASlow     = INVALID_HANDLE;

//--- UI
string         g_uiPrefix        = "IMPERA_";

//+------------------------------------------------------------------+
//| LICENSE: Base-36 Helper                                           |
//+------------------------------------------------------------------+
int Base36CharToVal(ushort c)
{
   if(c >= '0' && c <= '9') return (int)(c - '0');
   if(c >= 'A' && c <= 'Z') return (int)(c - 'A' + 10);
   if(c >= 'a' && c <= 'z') return (int)(c - 'a' + 10);
   return -1;
}

string NumToBase36(int n)
{
   string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
   string result = "";
   for(int i = 0; i < 4; i++)
   {
      int idx = n % 36;
      result = StringSubstr(chars, idx, 1) + result;
      n = n / 36;
   }
   return result;
}

int Base36ToNum(string s)
{
   int result = 0;
   for(int i = 0; i < StringLen(s); i++)
   {
      int v = Base36CharToVal(StringGetCharacter(s, i));
      if(v < 0) return -1;
      result = result * 36 + v;
   }
   return result;
}

//+------------------------------------------------------------------+
//| LICENSE: DJB2 Checksum (matches Python generator)                |
//+------------------------------------------------------------------+
string CalculateChecksum(string xxxx)
{
   uint h = 5381;
   for(int i = 0; i < 4; i++)
   {
      ushort c = StringGetCharacter(xxxx, i);
      h = ((h << 5) + h) + (uint)c;
   }
   h = h % 1679616;
   return NumToBase36((int)h);
}

//+------------------------------------------------------------------+
//| LICENSE: Validate Key (IMPERA-XXXX-YYYY)                           |
//| XXXX = base-36 encoded key number (1-10000)                     |
//| YYYY = DJB2 checksum of XXXX                                    |
//| Total valid keys: exactly 10,000                                |
//+------------------------------------------------------------------+
bool ValidateLicenseKey(string key)
{
   string upper = key;
   StringToUpper(upper);
   StringTrimLeft(upper);
   StringTrimRight(upper);

   if(StringLen(upper) != 16) return false;
   if(StringSubstr(upper, 0, 7) != "IMPERA-") return false;
   if(StringGetCharacter(upper, 11) != '-') return false;

   string xxxx = StringSubstr(upper, 7, 4);
   string yyyy = StringSubstr(upper, 12, 4);

   for(int i = 0; i < 4; i++)
   {
      ushort cx = StringGetCharacter(xxxx, i);
      if(!((cx >= '0' && cx <= '9') || (cx >= 'A' && cx <= 'Z')))
         return false;
   }

   for(int i = 0; i < 4; i++)
   {
      ushort cy = StringGetCharacter(yyyy, i);
      if(!((cy >= '0' && cy <= '9') || (cy >= 'A' && cy <= 'Z')))
         return false;
   }

   int keyNum = Base36ToNum(xxxx);
   if(keyNum < 1 || keyNum > 10000) return false;

   string expected = CalculateChecksum(xxxx);
   if(yyyy != expected) return false;

   return true;
}

//+------------------------------------------------------------------+
//| LICENSE: Get key number from valid key                           |
//+------------------------------------------------------------------+
int GetKeyNumber(string key)
{
   string upper = key;
   StringToUpper(upper);
   string xxxx = StringSubstr(upper, 7, 4);
   return Base36ToNum(xxxx);
}

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
{
   //--- LICENSE VALIDATION (First thing)
   g_licenseKey = InpLicenseKey;
   StringTrimLeft(g_licenseKey);
   StringTrimRight(g_licenseKey);

   if(StringLen(g_licenseKey) == 0)
   {
      Print("IMPERA: LICENSE KEY REQUIRED. Enter your key in Inputs.");
      Print("IMPERA: Format: IMPERA-XXXX-XXXX");
      if(InpShowUI) BuildUI();
      return(INIT_SUCCEEDED);
   }

   if(!ValidateLicenseKey(g_licenseKey))
   {
      Print("IMPERA: *** LICENSE INVALID *** Key: ", g_licenseKey);
      Print("IMPERA: Purchase a valid license from IMPERA Platinum.");
      if(InpShowUI) BuildUI();
      return(INIT_FAILED);
   }

   g_licenseValid = true;
   g_keyNumber = GetKeyNumber(g_licenseKey);
   Print("IMPERA: License VALID | Key #", g_keyNumber, " | ", g_licenseKey);

   //--- Trade setup
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   //--- Symbol
   g_symbol = _Symbol;
   if(!symInfo.Name(g_symbol))
   {
      Print("IMPERA: Cannot init symbol ", g_symbol);
      return(INIT_FAILED);
   }
   g_digits = (int)SymbolInfoInteger(g_symbol, SYMBOL_DIGITS);
   g_point  = SymbolInfoDouble(g_symbol, SYMBOL_POINT);

   //--- Indicators
   g_hRSI     = iRSI(g_symbol, PERIOD_CURRENT, InpRSIPeriod, PRICE_CLOSE);
   g_hMACD    = iMACD(g_symbol, PERIOD_CURRENT, InpMACDFast, InpMACDSlow, InpMACDSignal, PRICE_CLOSE);
   g_hBB      = iBands(g_symbol, PERIOD_CURRENT, InpBBPeriod, 0, InpBBDeviation, PRICE_CLOSE);
   g_hATR     = iATR(g_symbol, PERIOD_CURRENT, InpATRPeriod);
   g_hEMAFast = iMA(g_symbol, PERIOD_CURRENT, InpEMAFast, 0, MODE_EMA, PRICE_CLOSE);
   g_hEMASlow = iMA(g_symbol, PERIOD_CURRENT, InpEMASlow, 0, MODE_EMA, PRICE_CLOSE);
   g_hHTFEMAFast = iMA(g_symbol, InpHTF, InpHTFEMAFast, 0, MODE_EMA, PRICE_CLOSE);
   g_hHTFEMASlow = iMA(g_symbol, InpHTF, InpHTFEMASlow, 0, MODE_EMA, PRICE_CLOSE);

   if(g_hRSI == INVALID_HANDLE || g_hMACD == INVALID_HANDLE ||
      g_hBB == INVALID_HANDLE || g_hATR == INVALID_HANDLE ||
      g_hEMAFast == INVALID_HANDLE || g_hEMASlow == INVALID_HANDLE)
   {
      Print("IMPERA: Failed to create indicators");
      return(INIT_FAILED);
   }

   //--- State
   g_peakEquity     = accInfo.Equity();
   g_dayStartEquity = accInfo.Equity();
   g_lastDayTime    = iTime(g_symbol, PERIOD_D1, 0);

   if(InpShowUI) BuildUI();

   Print("IMPERA Platinum v4.0 HF initialized | ", g_symbol,
         " | Key #", g_keyNumber,
         " | Mode: ", EnumToString(InpSignalMode),
         " | Cooldown: ", IntegerToString(InpCooldownSec), "s",
         " | MaxPos: ", IntegerToString(InpMaxPositions));
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   ObjectsDeleteAll(0, g_uiPrefix);
   Comment("");
   if(g_hRSI     != INVALID_HANDLE) IndicatorRelease(g_hRSI);
   if(g_hMACD    != INVALID_HANDLE) IndicatorRelease(g_hMACD);
   if(g_hBB      != INVALID_HANDLE) IndicatorRelease(g_hBB);
   if(g_hATR     != INVALID_HANDLE) IndicatorRelease(g_hATR);
   if(g_hEMAFast != INVALID_HANDLE) IndicatorRelease(g_hEMAFast);
   if(g_hEMASlow != INVALID_HANDLE) IndicatorRelease(g_hEMASlow);
   if(g_hHTFEMAFast != INVALID_HANDLE) IndicatorRelease(g_hHTFEMAFast);
   if(g_hHTFEMASlow != INVALID_HANDLE) IndicatorRelease(g_hHTFEMASlow);
   Print("IMPERA Platinum deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   if(!g_licenseValid)
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   symInfo.RefreshRates();
   CheckNewDay();

   double equity = accInfo.Equity();
   if(equity > g_peakEquity) g_peakEquity = equity;

   if(CheckDrawdownLimit())
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   ManageOpenPositions();

   if(InpUseSession && !IsWithinSession())
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   //--- Scan mode: every tick (fast) or new bar only (slow)
   if(!InpTickScan && !IsNewBar())
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   if(CountMyPositions() >= InpMaxPositions)
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   if(g_paused)
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   //--- Cooldown: prevent rapid re-entry
   if(TimeCurrent() - g_lastTradeTime < InpCooldownSec)
   {
      if(InpShowUI) UpdateUI();
      return;
   }

   int signal = AnalyzeSignal();
   if(signal == 1)
   {
      if(OpenBuy()) g_lastTradeTime = TimeCurrent();
   }
   else if(signal == -1)
   {
      if(OpenSell()) g_lastTradeTime = TimeCurrent();
   }

   if(InpShowUI) UpdateUI();
   SendWebReport();
}

//+------------------------------------------------------------------+
//| High-Frequency Signal Engine v4.0                                 |
//| 8 Entry types: momentum, pullback, reversal, breakout,           |
//| trend continuation, divergence, candle pattern, EMA band         |
//| Designed to find a trade on almost every candle                  |
//+------------------------------------------------------------------+
int AnalyzeSignal()
{
   double rsi[], macdMain[], macdSignal[], macdHist[];
   double bbUpper[], bbLower[], bbMiddle[];
   double atr[], emaFast[], emaSlow[];

   if(CopyBuffer(g_hRSI,     0, 0, 5, rsi) < 5)       return 0;
   if(CopyBuffer(g_hMACD,    0, 0, 5, macdMain) < 5)   return 0;
   if(CopyBuffer(g_hMACD,    1, 0, 5, macdSignal) < 5) return 0;
   if(CopyBuffer(g_hBB,      1, 0, 5, bbUpper) < 5)    return 0;
   if(CopyBuffer(g_hBB,      2, 0, 5, bbLower) < 5)    return 0;
   if(CopyBuffer(g_hBB,      0, 0, 5, bbMiddle) < 5)   return 0;
   if(CopyBuffer(g_hATR,     0, 0, 5, atr) < 5)        return 0;
   if(CopyBuffer(g_hEMAFast, 0, 0, 5, emaFast) < 5)    return 0;
   if(CopyBuffer(g_hEMASlow, 0, 0, 5, emaSlow) < 5)    return 0;

   ArraySetAsSeries(rsi, true);
   ArraySetAsSeries(macdMain, true);
   ArraySetAsSeries(macdSignal, true);
   ArraySetAsSeries(bbUpper, true);
   ArraySetAsSeries(bbLower, true);
   ArraySetAsSeries(bbMiddle, true);
   ArraySetAsSeries(atr, true);
   ArraySetAsSeries(emaFast, true);
   ArraySetAsSeries(emaSlow, true);

   MqlRates rates[];
   if(CopyRates(g_symbol, PERIOD_CURRENT, 0, 5, rates) < 5) return 0;
   double open1  = rates[1].open;
   double close1 = rates[1].close;
   double high1  = rates[1].high;
   double low1   = rates[1].low;
   double open2  = rates[2].open;
   double close2 = rates[2].close;

   //--- Optional ATR filter (very lenient now)
   if(InpATRFilter)
   {
      double atrVal = atr[1];
      double atrAvg = (atr[0] + atr[1] + atr[2]) / 3.0;
      if(atrVal < atrAvg * InpATRMinRatio) return 0;
   }

   int buyConf = 0, sellConf = 0;
   double priceNow = (close1 + close2) / 2.0;
   double candleRange = high1 - low1;
   double bodySize = MathAbs(close1 - open1);
   bool bullCandle = close1 > open1;
   bool bearCandle = close1 < open1;

   //=== ENTRY TYPE 1: RSI Momentum ===
   if(rsi[1] < 40 && rsi[1] > rsi[2])         buyConf++;
   else if(rsi[1] > 60 && rsi[1] < rsi[2])    sellConf++;

   //=== ENTRY TYPE 2: RSI Extreme Reversal ===
   if(rsi[1] < 25)  buyConf++;
   else if(rsi[1] > 75)  sellConf++;

   //=== ENTRY TYPE 3: MACD Momentum Shift ===
   if(macdMain[1] > macdSignal[1] && macdMain[0] > macdMain[1])  buyConf++;
   else if(macdMain[1] < macdSignal[1] && macdMain[0] < macdMain[1])  sellConf++;

   //=== ENTRY TYPE 4: MACD Zero Cross ===
   if(macdMain[1] > 0 && macdMain[2] <= 0)  buyConf++;
   else if(macdMain[1] < 0 && macdMain[2] >= 0)  sellConf++;

   //=== ENTRY TYPE 5: Bollinger Band Touch/Reject ===
   if(close1 <= bbLower[1] || low1 <= bbLower[1])  buyConf++;
   else if(close1 >= bbUpper[1] || high1 >= bbUpper[1])  sellConf++;

   //=== ENTRY TYPE 6: BB Midline Cross ===
   if(close1 > bbMiddle[1] && close2 <= bbMiddle[1])  buyConf++;
   else if(close1 < bbMiddle[1] && close2 >= bbMiddle[1])  sellConf++;

   //=== ENTRY TYPE 7: EMA Trend Alignment ===
   if(emaFast[1] > emaSlow[1] && close1 > emaFast[1])  buyConf++;
   else if(emaFast[1] < emaSlow[1] && close1 < emaFast[1])  sellConf++;

   //=== ENTRY TYPE 8: EMA Crossover ===
   if(emaFast[1] > emaSlow[1] && emaFast[2] <= emaSlow[2])  buyConf++;
   else if(emaFast[1] < emaSlow[1] && emaFast[2] >= emaSlow[2])  sellConf++;

   //=== ENTRY TYPE 9: Candle Body Momentum ===
   if(bullCandle && bodySize > candleRange * 0.6 && close1 > open2)  buyConf++;
   else if(bearCandle && bodySize > candleRange * 0.6 && close1 < open2)  sellConf++;

   //=== ENTRY TYPE 10: Pullback to EMA ===
   if(bullCandle && low1 <= emaFast[1] * 1.001 && close1 > emaFast[1] && emaFast[1] > emaSlow[1])  buyConf++;
   else if(bearCandle && high1 >= emaFast[1] * 0.999 && close1 < emaFast[1] && emaFast[1] < emaSlow[1])  sellConf++;

   //=== ENTRY TYPE 11: Higher timeframe trend (bonus) ===
   if(InpMultiTF && g_hHTFEMAFast != INVALID_HANDLE && g_hHTFEMASlow != INVALID_HANDLE)
   {
      double htfFast[], htfSlow[];
      if(CopyBuffer(g_hHTFEMAFast, 0, 0, 2, htfFast) == 2 &&
         CopyBuffer(g_hHTFEMASlow, 0, 0, 2, htfSlow) == 2)
      {
         ArraySetAsSeries(htfFast, true);
         ArraySetAsSeries(htfSlow, true);
         if(htfFast[0] > htfSlow[0])  buyConf++;
         else                          sellConf++;
      }
   }

   //=== Determine minimum confirmations ===
   int minConf = InpMinConfirm;
   if(InpSignalMode == MODE_CONSERVATIVE) minConf = 3;
   else if(InpSignalMode == MODE_BALANCED)  minConf = 2;
   else if(InpSignalMode == MODE_AGGRESSIVE) minConf = 1;

   if(InpLogSignals)
   {
      Print("IMPERA v4 | RSI:", DoubleToString(rsi[1], 1),
            " | MACD:", DoubleToString(macdMain[1], 5),
            " | Close:", DoubleToString(close1, g_digits),
            " | Buy:", buyConf, " Sell:", sellConf, " Need:", minConf);
   }

   if(buyConf >= minConf && buyConf > sellConf)  return 1;
   if(sellConf >= minConf && sellConf > buyConf) return -1;
   return 0;
}

//+------------------------------------------------------------------+
//| Open Buy (returns true on success)                               |
//+------------------------------------------------------------------+
bool OpenBuy()
{
   double lot = CalcLot();
   if(lot <= 0) return false;
   double ask = symInfo.Ask();
   double atr = 0;
   double buf[];
   if(CopyBuffer(g_hATR, 0, 0, 1, buf) == 1) atr = buf[0];

   double sl = 0, tp = 0;
   if(InpSLMultiplier > 0 && atr > 0) sl = NormalizeDouble(ask - atr * InpSLMultiplier, g_digits);
   if(InpTPMultiplier > 0 && atr > 0) tp = NormalizeDouble(ask + atr * InpTPMultiplier, g_digits);
   if(InpStopLossPips > 0) sl = NormalizeDouble(ask - InpStopLossPips * g_point, g_digits);
   if(InpTakeProfitPips > 0) tp = NormalizeDouble(ask + InpTakeProfitPips * g_point, g_digits);

   string comment = "IMPERA|BUY|" + TimeToString(TimeCurrent(), TIME_MINUTES);
   if(trade.Buy(lot, g_symbol, ask, sl, tp, comment))
   {
      LogTrade("BUY", lot, ask, sl, tp);
      return true;
   }
   Print("IMPERA BUY FAIL: err=", GetLastError(), " ret=", trade.ResultRetcode());
   return false;
}

//+------------------------------------------------------------------+
//| Open Sell (returns true on success)                              |
//+------------------------------------------------------------------+
bool OpenSell()
{
   double lot = CalcLot();
   if(lot <= 0) return false;
   double bid = symInfo.Bid();
   double atr = 0;
   double buf[];
   if(CopyBuffer(g_hATR, 0, 0, 1, buf) == 1) atr = buf[0];

   double sl = 0, tp = 0;
   if(InpSLMultiplier > 0 && atr > 0) sl = NormalizeDouble(bid + atr * InpSLMultiplier, g_digits);
   if(InpTPMultiplier > 0 && atr > 0) tp = NormalizeDouble(bid - atr * InpTPMultiplier, g_digits);
   if(InpStopLossPips > 0) sl = NormalizeDouble(bid + InpStopLossPips * g_point, g_digits);
   if(InpTakeProfitPips > 0) tp = NormalizeDouble(bid - InpTakeProfitPips * g_point, g_digits);

   string comment = "IMPERA|SELL|" + TimeToString(TimeCurrent(), TIME_MINUTES);
   if(trade.Sell(lot, g_symbol, bid, sl, tp, comment))
   {
      LogTrade("SELL", lot, bid, sl, tp);
      return true;
   }
   Print("IMPERA SELL FAIL: err=", GetLastError(), " ret=", trade.ResultRetcode());
   return false;
}

//+------------------------------------------------------------------+
//| Calculate Lot Size                                               |
//+------------------------------------------------------------------+
double CalcLot()
{
   double lot = InpFixedLot;
   double minVol  = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MIN);
   double maxVol  = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MAX);
   double stepVol = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_STEP);

   if(InpLotMode == LOT_FIXED)
   {
      lot = InpFixedLot;
   }
   else if(InpLotMode == LOT_RISK_PCT)
   {
      double balance   = accInfo.Balance();
      double riskMoney = balance * InpRiskPercent / 100.0;
      double atr = 0;
      double buf[];
      if(CopyBuffer(g_hATR, 0, 0, 1, buf) == 1) atr = buf[0];
      if(atr <= 0) atr = g_point * 100;

      double slDist  = atr * InpSLMultiplier;
      double tickVal = SymbolInfoDouble(g_symbol, SYMBOL_TRADE_TICK_VALUE);
      double tickSz  = SymbolInfoDouble(g_symbol, SYMBOL_TRADE_TICK_SIZE);
      if(tickVal <= 0 || tickSz <= 0) return InpMinLot;

      double valuePerLot = slDist / tickSz * tickVal;
      lot = (valuePerLot > 0) ? riskMoney / valuePerLot : InpMinLot;
   }
   else if(InpLotMode == LOT_BALANCE_SCALE)
   {
      double balance = accInfo.Balance();
      lot = (InpBalanceScaleBase > 0) ? InpFixedLot * (balance / InpBalanceScaleBase) : InpFixedLot;
   }

   if(lot < minVol) lot = minVol;
   if(lot > maxVol) lot = maxVol;
   if(lot < InpMinLot) lot = InpMinLot;
   if(lot > InpMaxLot) lot = InpMaxLot;
   if(stepVol > 0) lot = MathFloor(lot / stepVol) * stepVol;
   return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Manage Open Positions                                            |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != g_symbol) continue;
      if(!posInfo.SelectByTicket(ticket)) continue;

      double openPrice = posInfo.PriceOpen();
      double currentSL = posInfo.StopLoss();
      double currentTP = posInfo.TakeProfit();
      long   posType   = posInfo.PositionType();

      double priceNow = (posType == POSITION_TYPE_BUY) ? symInfo.Bid() : symInfo.Ask();
      double profitPts = (posType == POSITION_TYPE_BUY) ?
                         (priceNow - openPrice) / g_point :
                         (openPrice - priceNow) / g_point;

      if(InpCloseEOD && IsEndOfDay())
      {
         trade.PositionClose(ticket);
         continue;
      }

      if(InpUseBreakeven)
      {
         double beLock = InpBEPips * g_point;
         if(posType == POSITION_TYPE_BUY)
         {
            if(profitPts >= InpBEStartPips && (currentSL < openPrice + beLock || currentSL == 0))
               trade.PositionModify(ticket, NormalizeDouble(openPrice + beLock, g_digits), currentTP);
         }
         else
         {
            if(profitPts >= InpBEStartPips && (currentSL > openPrice - beLock || currentSL == 0))
               trade.PositionModify(ticket, NormalizeDouble(openPrice - beLock, g_digits), currentTP);
         }
      }

      if(InpUseTrailing)
      {
         double trailStep = InpTrailStepPips * g_point;
         if(trailStep <= 0) continue;
         if(posType == POSITION_TYPE_BUY)
         {
            if(profitPts >= InpTrailStartPips)
            {
               double newSL = NormalizeDouble(priceNow - trailStep, g_digits);
               if((newSL > currentSL || currentSL == 0) && newSL > openPrice)
                  trade.PositionModify(ticket, newSL, currentTP);
            }
         }
         else
         {
            if(profitPts >= InpTrailStartPips)
            {
               double newSL = NormalizeDouble(priceNow + trailStep, g_digits);
               if((newSL < currentSL || currentSL == 0) && newSL < openPrice)
                  trade.PositionModify(ticket, newSL, currentTP);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Drawdown Protection                                              |
//+------------------------------------------------------------------+
bool CheckDrawdownLimit()
{
   double equity = accInfo.Equity();

   if(g_dayStartEquity > 0)
   {
      double dailyDD = (g_dayStartEquity - equity) / g_dayStartEquity * 100.0;
      if(dailyDD >= InpMaxDailyDD)
      {
         Print("IMPERA: DAILY DD LIMIT: ", DoubleToString(dailyDD, 1), "%");
         CloseAllPositions("DAILY_DD");
         return true;
      }
   }

   if(g_peakEquity > 0)
   {
      double totalDD = (g_peakEquity - equity) / g_peakEquity * 100.0;
      if(totalDD > g_maxDD) g_maxDD = totalDD;
      if(totalDD >= InpMaxTotalDD)
      {
         Print("IMPERA: TOTAL DD LIMIT: ", DoubleToString(totalDD, 1), "%");
         CloseAllPositions("TOTAL_DD");
         return true;
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//| Session / Time Helpers                                           |
//+------------------------------------------------------------------+
bool IsWithinSession()
{
   MqlDateTime dt; TimeCurrent(dt);
   if(InpSessionStartH < InpSessionEndH)
      return (dt.hour >= InpSessionStartH && dt.hour < InpSessionEndH);
   else
      return (dt.hour >= InpSessionStartH || dt.hour < InpSessionEndH);
}

bool IsEndOfDay()
{
   MqlDateTime dt; TimeCurrent(dt);
   return (dt.hour >= 23 && dt.min >= 50);
}

void CheckNewDay()
{
   datetime today = iTime(g_symbol, PERIOD_D1, 0);
   if(today != g_lastDayTime)
   {
      g_lastDayTime    = today;
      g_dayStartEquity = accInfo.Equity();
   }
}

bool IsNewBar()
{
   datetime barTime = iTime(g_symbol, PERIOD_CURRENT, 0);
   if(barTime != g_lastBarTime)
   {
      g_lastBarTime = barTime;
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Position Helpers                                                 |
//+------------------------------------------------------------------+
int CountMyPositions()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket > 0 && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber &&
         PositionGetString(POSITION_SYMBOL) == g_symbol)
         count++;
   }
   return count;
}

void CloseAllPositions(string reason)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != g_symbol) continue;
      trade.PositionClose(ticket);
      if(InpLogTrades) Print("IMPERA CLOSE [", reason, "] #", ticket);
   }
}

void LogTrade(string dir, double lot, double price, double sl, double tp)
{
   Print("IMPERA ", dir, " | Lot:", DoubleToString(lot, 2),
         " | Price:", DoubleToString(price, g_digits),
         " | SL:", DoubleToString(sl, g_digits),
         " | TP:", DoubleToString(tp, g_digits),
         " | Bal:", DoubleToString(accInfo.Balance(), 2),
         " | Pos:", CountMyPositions());
}

//+------------------------------------------------------------------+
//| OnTradeTransaction                                               |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      ulong dt = trans.deal;
      if(HistoryDealSelect(dt))
      {
         if(HistoryDealGetInteger(dt, DEAL_MAGIC) == InpMagicNumber)
         {
            long entry = HistoryDealGetInteger(dt, DEAL_ENTRY);
            if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
            {
               double net = HistoryDealGetDouble(dt, DEAL_PROFIT) +
                            HistoryDealGetDouble(dt, DEAL_SWAP) +
                            HistoryDealGetDouble(dt, DEAL_COMMISSION);
                if(net >= 0) { g_winTrades++; g_winSum += net; }
                else { g_lossTrades++; g_lossSum += MathAbs(net); }
                g_totalProfit += net;
                if(g_winTrades > 0) g_avgWin = g_winSum / g_winTrades;
                if(g_lossTrades > 0) g_avgLoss = g_lossSum / g_lossTrades;
                g_profitFactor = (g_lossSum > 0) ? g_winSum / g_lossSum : (g_winSum > 0 ? 99.99 : 0);
               Print("IMPERA CLOSED | Net:", DoubleToString(net, 2),
                     " | W:", g_winTrades, " L:", g_lossTrades,
                     " | Total:", DoubleToString(g_totalProfit, 2));
            }
         }
      }
   }
}

void OnTimer()
{
   double eq = accInfo.Equity();
   if(eq > g_peakEquity) g_peakEquity = eq;
}

//+------------------------------------------------------------------+
//| Web Reporting: Send stats to server                              |
//+------------------------------------------------------------------+
void SendWebReport()
{
   if(!InpWebReport || !g_licenseValid) return;
   if(TimeCurrent() - g_lastReportTime < InpReportInterval) return;
   g_lastReportTime = TimeCurrent();

   double balance = accInfo.Balance();
   double equity  = accInfo.Equity();
   double dailyDD = (g_dayStartEquity > 0) ? (g_dayStartEquity - equity) / g_dayStartEquity * 100.0 : 0;
   int totalTrades = g_winTrades + g_lossTrades;

   // Build open positions JSON
   string openPosJson = "[";
   int posCount = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if(t <= 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != g_symbol) continue;
      if(posCount > 0) openPosJson += ",";
      string dir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      openPosJson += "{\"ticket\":" + IntegerToString(t) +
                     ",\"symbol\":\"" + PositionGetString(POSITION_SYMBOL) + "\"" +
                     ",\"type\":\"" + dir + "\"" +
                     ",\"lots\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2) +
                     ",\"open\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), g_digits) +
                     ",\"sl\":" + DoubleToString(PositionGetDouble(POSITION_SL), g_digits) +
                     ",\"tp\":" + DoubleToString(PositionGetDouble(POSITION_TP), g_digits) +
                     ",\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP) + PositionGetDouble(POSITION_COMMISSION), 2) +
                     "}";
      posCount++;
   }
   openPosJson += "]";

   // Build JSON payload
   string json = "{";
   json += "\"key\":\"" + g_licenseKey + "\",";
   json += "\"balance\":" + DoubleToString(balance, 2) + ",";
   json += "\"equity\":" + DoubleToString(equity, 2) + ",";
   json += "\"wins\":" + IntegerToString(g_winTrades) + ",";
   json += "\"losses\":" + IntegerToString(g_lossTrades) + ",";
   json += "\"total_trades\":" + IntegerToString(totalTrades) + ",";
   json += "\"total_profit\":" + DoubleToString(g_totalProfit, 2) + ",";
   json += "\"avg_win\":" + DoubleToString(g_avgWin, 2) + ",";
   json += "\"avg_loss\":" + DoubleToString(g_avgLoss, 2) + ",";
   json += "\"profit_factor\":" + DoubleToString(g_profitFactor, 2) + ",";
   json += "\"max_dd\":" + DoubleToString(g_maxDD, 2) + ",";
   json += "\"daily_dd\":" + DoubleToString(dailyDD, 2) + ",";
   json += "\"open_positions\":" + IntegerToString(posCount) + ",";
   json += "\"open_trades\":" + openPosJson + ",";
   json += "\"symbol\":\"" + g_symbol + "\",";
   json += "\"magic\":" + IntegerToString(InpMagicNumber) + ",";
   json += "\"timestamp\":" + IntegerToString(TimeCurrent());
   json += "}";

   // Send HTTP POST
   string url = InpWebURL + "/api/bot/report";
   string headers = "Content-Type: application/json\r\n";
   char data[];
   char result[];
   string resultHeaders;

   ArrayResize(data, StringLen(json));
   for(int i = 0; i < StringLen(json); i++) data[i] = (uchar)StringGetCharacter(json, i);

   int res = WebRequest("POST", url, headers, 5000, data, result, resultHeaders);
   if(res == -1)
   {
      int err = GetLastError();
      if(InpLogTrades) Print("IMPERA WEB REPORT FAIL: err=", err, " (add ", InpWebURL, " to MT5 allowed URLs)");
   }
   else if(InpLogTrades)
   {
      Print("IMPERA WEB REPORT OK: status=", res, " | Bal:", DoubleToString(balance, 2),
            " | Eq:", DoubleToString(equity, 2), " | W:", g_winTrades, " L:", g_lossTrades,
            " | P/L:", DoubleToString(g_totalProfit, 2));
   }
}

//+------------------------------------------------------------------+
//| UI: Build Dashboard                                              |
//+------------------------------------------------------------------+
void BuildUI()
{
   int W = 320, H = 500;
   CreateRect(g_uiPrefix + "BG", InpUIX, InpUIY, W, H, InpUIColor);
   CreateRect(g_uiPrefix + "TitleBG", InpUIX, InpUIY, W, 35, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "Title", InpUIX + 10, InpUIY + 8, "IMPERA PLATINUM v4.0", 11, clrWhite);

   int y = InpUIY + 45;
   CreateLabel(g_uiPrefix + "L_Lic",   InpUIX + 10, y,     "License:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Lic",   InpUIX + 130, y,    "CHECKING", 9, clrYellow);
   y += 20;
   CreateLabel(g_uiPrefix + "L_Key",   InpUIX + 10, y,     "Key:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Key",   InpUIX + 130, y,    "---", 8, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_Mode",  InpUIX + 10, y,     "Mode:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Mode",  InpUIX + 130, y,    EnumToString(InpSignalMode), 9, InpUITextColor);
   y += 20;
   CreateRect(g_uiPrefix + "Sep1", InpUIX + 10, y, W - 20, 1, InpUIAccentColor);
   y += 10;

   CreateLabel(g_uiPrefix + "L_Bal",   InpUIX + 10, y,     "Balance:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Bal",   InpUIX + 130, y,    "$0.00", 9, InpUIProfitColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_Eq",    InpUIX + 10, y,     "Equity:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Eq",    InpUIX + 130, y,    "$0.00", 9, InpUIProfitColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_Marg",  InpUIX + 10, y,     "Margin:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Marg",  InpUIX + 130, y,    "0%", 9, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_DDD",   InpUIX + 10, y,     "Daily DD:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_DDD",   InpUIX + 130, y,    "0%", 9, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_TDD",   InpUIX + 10, y,     "Max DD:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_TDD",   InpUIX + 130, y,    "0%", 9, InpUITextColor);
   y += 20;
   CreateRect(g_uiPrefix + "Sep2", InpUIX + 10, y, W - 20, 1, InpUIAccentColor);
   y += 10;

   CreateLabel(g_uiPrefix + "L_Pos",   InpUIX + 10, y,     "Positions:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Pos",   InpUIX + 170, y,    "0", 9, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_Lots",  InpUIX + 10, y,     "Total Lots:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_Lots",  InpUIX + 170, y,    "0.00", 9, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_FL",    InpUIX + 10, y,     "Floating:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_FL",    InpUIX + 170, y,    "$0.00", 9, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_NL",    InpUIX + 10, y,     "Next Lot:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_NL",    InpUIX + 170, y,    "0.01", 9, InpUITextColor);
   y += 20;
   CreateRect(g_uiPrefix + "Sep3", InpUIX + 10, y, W - 20, 1, InpUIAccentColor);
   y += 10;

   CreateLabel(g_uiPrefix + "L_W",     InpUIX + 10, y,     "Wins:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_W",     InpUIX + 170, y,    "0", 9, InpUIProfitColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_L",     InpUIX + 10, y,     "Losses:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_L",     InpUIX + 170, y,    "0", 9, InpUILossColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_WR",    InpUIX + 10, y,     "Win Rate:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_WR",    InpUIX + 170, y,    "0%", 9, InpUITextColor);
   y += 20;
   CreateLabel(g_uiPrefix + "L_TP",    InpUIX + 10, y,     "Total P/L:", 9, InpUIAccentColor);
   CreateLabel(g_uiPrefix + "V_TP",    InpUIX + 170, y,    "$0.00", 9, InpUITextColor);
   y += 20;
   CreateRect(g_uiPrefix + "Sep4", InpUIX + 10, y, W - 20, 1, InpUIAccentColor);
   y += 10;

   CreateButton(g_uiPrefix + "Btn_P", InpUIX + 10, y, 145, 28, "PAUSE", InpUIAccentColor, clrWhite);
   CreateButton(g_uiPrefix + "Btn_C", InpUIX + 165, y, 145, 28, "CLOSE ALL", clrRed, clrWhite);
}

//+------------------------------------------------------------------+
//| UI: Update Dashboard                                             |
//+------------------------------------------------------------------+
void UpdateUI()
{
   if(ObjectFind(0, g_uiPrefix + "V_Lic") < 0) return;

   if(g_licenseValid)
   {
      SetLabel(g_uiPrefix + "V_Lic", "VALID", 9, InpUIProfitColor);
      SetLabel(g_uiPrefix + "V_Key", g_licenseKey + " (#" + IntegerToString(g_keyNumber) + ")", 8, InpUITextColor);
   }
   else if(StringLen(InpLicenseKey) > 0)
   {
      SetLabel(g_uiPrefix + "V_Lic", "INVALID", 9, InpUILossColor);
      SetLabel(g_uiPrefix + "V_Key", "License rejected", 8, InpUILossColor);
   }
   else
   {
      SetLabel(g_uiPrefix + "V_Lic", "NO KEY", 9, clrYellow);
      SetLabel(g_uiPrefix + "V_Key", "Enter key in Inputs", 8, clrYellow);
   }

   SetLabel(g_uiPrefix + "V_Mode", EnumToString(InpSignalMode), 9, InpUITextColor);

   double bal = accInfo.Balance();
   double eq  = accInfo.Equity();
   double ml  = accInfo.MarginLevel();

   SetLabel(g_uiPrefix + "V_Bal", "$" + DoubleToString(bal, 2), 9, InpUIProfitColor);
   SetLabel(g_uiPrefix + "V_Eq",  "$" + DoubleToString(eq, 2), 9, eq >= bal ? InpUIProfitColor : InpUILossColor);
   SetLabel(g_uiPrefix + "V_Marg", DoubleToString(ml, 0) + "%", 9, ml > 300 ? InpUIProfitColor : InpUILossColor);

   double dailyDD = (g_dayStartEquity > 0) ? (g_dayStartEquity - eq) / g_dayStartEquity * 100.0 : 0;
   SetLabel(g_uiPrefix + "V_DDD", DoubleToString(dailyDD, 1) + "%/" + DoubleToString(InpMaxDailyDD, 1) + "%", 9,
            dailyDD < InpMaxDailyDD * 0.7 ? InpUIProfitColor : InpUILossColor);
   SetLabel(g_uiPrefix + "V_TDD", DoubleToString(g_maxDD, 1) + "%/" + DoubleToString(InpMaxTotalDD, 1) + "%", 9,
            g_maxDD < InpMaxTotalDD * 0.7 ? InpUIProfitColor : InpUILossColor);

   int posN = 0;
   double totLots = 0, floatPL = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if(t <= 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != g_symbol) continue;
      posN++;
      totLots += PositionGetDouble(POSITION_VOLUME);
      floatPL += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP) + PositionGetDouble(POSITION_COMMISSION);
   }

   SetLabel(g_uiPrefix + "V_Pos",  IntegerToString(posN) + "/" + IntegerToString(InpMaxPositions), 9, InpUITextColor);
   SetLabel(g_uiPrefix + "V_Lots", DoubleToString(totLots, 2), 9, InpUITextColor);
   SetLabel(g_uiPrefix + "V_FL",   "$" + DoubleToString(floatPL, 2), 9, floatPL >= 0 ? InpUIProfitColor : InpUILossColor);
   SetLabel(g_uiPrefix + "V_NL",   DoubleToString(CalcLot(), 2), 9, InpUITextColor);

   int totalC = g_winTrades + g_lossTrades;
   double wr = (totalC > 0) ? (double)g_winTrades / (double)totalC * 100.0 : 0;
   SetLabel(g_uiPrefix + "V_W",  IntegerToString(g_winTrades), 9, InpUIProfitColor);
   SetLabel(g_uiPrefix + "V_L",  IntegerToString(g_lossTrades), 9, InpUILossColor);
   SetLabel(g_uiPrefix + "V_WR", DoubleToString(wr, 1) + "%", 9, wr >= 50 ? InpUIProfitColor : InpUILossColor);
   SetLabel(g_uiPrefix + "V_TP", "$" + DoubleToString(g_totalProfit, 2), 9, g_totalProfit >= 0 ? InpUIProfitColor : InpUILossColor);
}

//+------------------------------------------------------------------+
//| UI: Chart Event                                                  |
//+------------------------------------------------------------------+
void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   if(id != CHARTEVENT_OBJECT_CLICK) return;
   if(sparam == g_uiPrefix + "Btn_P")
   {
      g_paused = !g_paused;
      ObjectSetString(0, g_uiPrefix + "Btn_P", OBJPROP_TEXT, g_paused ? "RESUME" : "PAUSE");
      ObjectSetInteger(0, g_uiPrefix + "Btn_P", OBJPROP_BGCOLOR, g_paused ? InpUIProfitColor : InpUIAccentColor);
   }
   else if(sparam == g_uiPrefix + "Btn_C")
   {
      if(g_licenseValid) CloseAllPositions("MANUAL");
   }
   ChartRedraw();
}

//+------------------------------------------------------------------+
//| UI: Helpers                                                      |
//+------------------------------------------------------------------+
void CreateRect(string name, int x, int y, int w, int h, color clr)
{
   ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, InpUIAccentColor);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

void CreateLabel(string name, int x, int y, string text, int sz, color clr)
{
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetString(0, name, OBJPROP_FONT, "Arial");
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, sz);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

void CreateButton(string name, int x, int y, int w, int h, string text, color bg, color tc)
{
   ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 10);
   ObjectSetInteger(0, name, OBJPROP_COLOR, tc);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, clrGray);
   ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_STATE, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

void SetLabel(string name, string text, int sz, color clr)
{
   if(ObjectFind(0, name) < 0) return;
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, sz);
   ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
}
//+------------------------------------------------------------------+
//| End of IMPERA Platinum v3.0                                       |
//+------------------------------------------------------------------+
