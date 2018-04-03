// https://msdn.microsoft.com/en-us/library/windows/desktop/dd317756(v=vs.85).aspx
var WshShell = new ActiveXObject("WScript.Shell");
var OEMCP = WshShell.RegRead("HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage\\OEMCP");
var ACP = WshShell.RegRead("HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage\\ACP");

var sDecimal = WshShell.RegRead("HKEY_CURRENT_USER\\Control Panel\\International\\sDecimal");
var sShortDate = WshShell.RegRead("HKEY_CURRENT_USER\\Control Panel\\International\\sShortDate");

WScript.Echo(OEMCP, ACP, sDecimal, sShortDate);