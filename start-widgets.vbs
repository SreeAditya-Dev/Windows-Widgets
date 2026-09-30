Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\Projects\widget"
WshShell.Run "cmd /c npm start", 0, False
