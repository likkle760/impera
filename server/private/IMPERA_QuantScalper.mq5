//+------------------------------------------------------------------+
//|                                          IMPERA_QuantScalper.mq5 |
//|                        Copyright 2026, IMPERA AI - Premium Trading|
//|                                            https://impera.com     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, IMPERA AI"
#property link      "https://impera.com"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

input group "=== IMPERA Quant Scalper — PRO ==="
input string   InpLicenceKey    = "IMPERA-XXXX-XXXX-XXXX";  // Licence Key
input int      InpMagicNumber   = 202607;                   // Magic Number
input double   InpLotSize       = 0.10;                     // Base Lot Size
input double   InpMaxSpread     = 15;                       // Max Spread (points)
input int      InpSlPoints      = 25;                       // Stop Loss (points)
input int      InpTpPoints      = 40;                       // Take Profit (points)
input int      InpMaxTrades     = 4;                        // Max Concurrent Trades
input bool     InpUseTrailing   = true;                     // Use Trailing Stop
input int      InpTrailStart    = 12;                       // Trailing Start (points)
input int      InpTrailStep     = 5;                        // Trailing Step (points)

input group "=== Quant Signal Engine ==="
input int      InpFastEMA       = 5;                        // Fast EMA
input int      InpSlowEMA       = 21;                       // Slow EMA
input int      InpRSIPeriod     = 9;                        // RSI Period
input int      InpATRPeriod     = 10;                       // ATR Period
input double   InpVolFilter     = 1.2;                      // Volume Spike Filter (x avg)
input bool     InpUseNewsFilter = true;                     // Avoid High-Impact News

input group "=== Session Filters ==="
input bool     InpTradeLondon   = true;                     // London Session
input bool     InpTradeNY       = true;                     // New York Session
input bool     InpTradeAsia     = false;                    // Asia Session

CTrade trade;

int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   return(INIT_SUCCEEDED);
}

void OnTick()
{
   // IMPERA Quant Scalper — quantitative tick-level scalping engine.
   // Full strategy core is delivered with licensed copies.
}
//+------------------------------------------------------------------+
