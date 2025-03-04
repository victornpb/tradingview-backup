# TradingView Backup/Restore Manager

This script allows you to **backup and restore** your TradingView drawing templates and themes effortlessly.

<img width="901" alt="image" src="https://github.com/user-attachments/assets/f05207d9-f56a-404d-a4f8-676dc7c5618e" />

## Features
- Backup and restore **drawing templates** and **themes**.
- Share your templates and themes across accounts or with friends.
- Export configurations to a file for safekeeping.
- Works on the same account or different accounts.

## How to run it

### Method 1: Browser Extension
1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Open this link to install the script [tvbackup.user.js](https://github.com/victornpb/tradingview-backup/raw/refs/heads/main/tvbackup.user.js)

### Method 2: Browser Console
1. Open the TradingView chart page.
2. Open your browser's developer tools (usually by pressing `F12` or `Ctrl+Shift+I`).
3. Copy and paste [the script](./tvbackup.user.js) into the **Console** tab and press `Enter`.

## Usage
1. Visit any TradingView chart while logged in.
2. Make sure your settings are saved and have a name ([Watch this 5s gif](https://github.com/user-attachments/assets/9f15e1d5-91cc-4f1d-ac21-b108b8b79ab9))
3. Use the Backup Manager UI (bottom-left corner):
   - **Fetch**: Extracts your templates/themes from TradingView.
   - **Export**: Save them as a JSON file.
   - **Import**: Load previously saved configurations.
   - **Apply**: Restore templates/themes back to TradingView.

----

## Disclaimer

TLDR: USE IT AT YOUR OWN RISK!

This script is provided **as-is** without any warranties. I am not responsible if this does not work as expected or causes any damages.
I am obviously not affiliated with trading view, this tool was created purely from reverse engineering APIs.
You can test this on a free trial account first if you want to make sure it works as you expect, and the code is not very hard to read if you think theres something sketchy going on.
