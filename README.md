# TradingView Backup/Restore Manager

This script allows you to **backup and restore** your TradingView drawing templates and themes effortlessly.

## Features
- Backup and restore **drawing templates** and **themes**.
- Share your templates and themes across accounts or with friends.
- Export configurations to a file for safekeeping.
- Works on the same account or different accounts.
  
<img width="901" alt="image" src="https://github.com/user-attachments/assets/f05207d9-f56a-404d-a4f8-676dc7c5618e" />

## How to use
1. Go to [TradingView](https://www.tradingview.com/chart/) on any chart while logged in.
2. Open your browser's developer tools (usually by pressing <kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>i</kbd>).
3. Copy and paste [tvbackup.user.js](https://github.com/victornpb/tradingview-backup/raw/refs/heads/main/tvbackup.user.js) into TradingView's **Console** tab and press <kbd>Enter</kbd>.

### Exporting a backup 
   1. First make sure your settings and theme are saved and have a name ([see how](https://github.com/user-attachments/assets/d88b97ae-b291-4dfa-a3b3-1d3f50c5aa4f))
   2. Click **Fetch**, to extract your templates/themes from TradingView
   3. Select what you want to export, or leave everything checked
   4. Click **Export**, to save them as a JSON file so you can keep a copy or share

### Restoring a backup
   1. Click **Import**, to Load previously saved JSON file.
   2. Select what you want to import, or leave everything checked
   3. Click **Apply**, to restore templates/themes back to TradingView.
   4. Refresh your window, go to configuration and [select your theme name](https://github.com/user-attachments/assets/9074a943-dead-4cae-8fd8-4e45a8cddb9f)

----

## Disclaimer

> TLDR: USE IT AT YOUR OWN RISK!
> 
> This script is provided **as-is** without any warranties. I am not responsible if this does not work as expected or causes any damages.
> I am obviously not affiliated with trading view, this tool was created purely from reverse engineering APIs.
> You can test this on a free trial account first if you want to make sure it works as you expect, and the code is not very hard to read if you think theres something sketchy going on.
