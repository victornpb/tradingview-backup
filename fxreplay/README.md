# TradingView to FXReplay Migration Tool

This script allows you to **migrate** your TradingView drawing templates and theme to FXReplay effortlessly.
<img width="1212" alt="image" src="https://github.com/user-attachments/assets/cb21dfd1-7d9c-4201-a1db-81e52be57933" />

### Create a backup on trading view
> Before using this migration tool, you must first create a backup of your TradingView templates and theme. 
> Using this other tool [TradingView Backup/Restore Manager – Exporting a Backup](https://github.com/victornpb/tradingview-backup/tree/main?tab=readme-ov-file#exporting-a-backup)

### How to run this
1. Go to [FXReplay](https://app.fxreplay.com/) on any chart session.
2. Open your browser's developer tools (usually by pressing <kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>i</kbd>).
3. Copy and paste [fxreplay.user.js](https://github.com/victornpb/tradingview-backup/raw/refs/heads/main/fxreplay/fxreplay.user.js) into FXReplay's **Console** tab and press <kbd>Enter</kbd>.

### Importing the backup into FXReplay
1. Click the **Import Backup File** button in the floating UI to select and load your backup JSON file.
2. Click **Restore Templates**. The script will automatically restore each drawing template and theme (the first one found in the backup).
3. Refresh

If your theme isn't taking effect you need to [delete your current layout](https://github.com/user-attachments/assets/35f377d0-7c05-4d3a-a225-798305798d9f)

**Done!** 

## Disclaimer

> **TL;DR: USE IT AT YOUR OWN RISK!**
> 
> This script is provided **as-is** without any warranties. I am not responsible if it does not work as expected or causes any issues.  
> I am not affiliated with FXReplay or TradingView; this tool was created solely by reverse engineering and for migration purposes.  
> Test it on a trial account first if you are unsure, and review the code if needed.

---

Happy Backtesting!
