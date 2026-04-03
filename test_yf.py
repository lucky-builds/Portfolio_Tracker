import yfinance as yf
ticker = yf.Ticker("ICICIBANK.NS")
print(ticker.fast_info)
