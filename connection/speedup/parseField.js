'use strict';

const debug = require('debug')('adodb:parseField');
//
// Data Type Enum
// https://msdn.microsoft.com/ru-ru/library/ms675318(v=vs.85).aspx
//

//const aArray = 0x2000; //A flag value, always combined with another data type constant, that indicates an array of the other data type. Does not apply to ADOX.
const adEmpty = 0; //Specifies no value (DBTYPE_EMPTY).
const adSmallInt = 2; //Indicates a two-byte signed integer (DBTYPE_I2).
const adInteger = 3; //Indicates a four-byte signed integer (DBTYPE_I4).
const adSingle = 4; //Indicates a single-precision floating-point value (DBTYPE_R4).
const adDouble = 5; //Indicates a double-precision floating-point value (DBTYPE_R8).
const adCurrency = 6; //Indicates a currency value (DBTYPE_CY). Currency is a fixed-point number with four digits to the right of the decimal point. It is stored in an eight-byte signed integer scaled by 10,000.
const adDate = 7; //Indicates a date value (DBTYPE_DATE). A date is stored as a double, the whole part of which is the number of days since December 30, 1899, and the fractional part of which is the fraction of a day.
const adBSTR = 8; //Indicates a null-terminated character string (Unicode) (DBTYPE_BSTR).
const adIDispatch = 9; //Indicates a pointer to an IDispatch interface on a COM object (DBTYPE_IDISPATCH). Note   This data type is currently not supported by ADO. Usage may cause unpredictable results.
const adError = 10; //Indicates a 32-bit error code (DBTYPE_ERROR).
const adBoolean = 11; //Indicates a Boolean value (DBTYPE_BOOL).
const adVariant = 12; //Indicates an Automation Variant (DBTYPE_VARIANT). Note   This data type is currently not supported by ADO. Usage may cause unpredictable results.
const adIUnknown = 13; //Indicates a pointer to an IUnknown interface on a COM object (DBTYPE_IUNKNOWN). Note   This data type is currently not supported by ADO. Usage may cause unpredictable results.
const adDecimal = 14; //Indicates an exact numeric value with a fixed precision and scale (DBTYPE_DECIMAL).
const adTinyInt = 16; //Indicates a one-byte signed integer (DBTYPE_I1).
const adUnsignedTinyInt = 17; //Indicates a one-byte unsigned integer (DBTYPE_UI1).
const adUnsignedSmallInt = 18; //Indicates a two-byte unsigned integer (DBTYPE_UI2).
const adUnsignedInt = 19; //Indicates a four-byte unsigned integer (DBTYPE_UI4).
const adBigInt = 20; //Indicates an eight-byte signed integer (DBTYPE_I8).
const adUnsignedBigInt = 21; //Indicates an eight-byte unsigned integer (DBTYPE_UI8).
const adFileTime = 64; //Indicates a 64-bit value representing the number of 100-nanosecond intervals since January 1, 1601 (DBTYPE_FILETIME).
const adGUID = 72; //Indicates a globally unique identifier (GUID) (DBTYPE_GUID).
const adBinary = 128; //Indicates a binary value (DBTYPE_BYTES).
const adChar = 129; //Indicates a string value (DBTYPE_STR).
const adWChar = 130; //Indicates a null-terminated Unicode character string (DBTYPE_WSTR).
const adNumeric = 131; //Indicates an exact numeric value with a fixed precision and scale (DBTYPE_NUMERIC).
const adUserDefined = 132; //Indicates a user-defined variable (DBTYPE_UDT).
const adDBDate = 133; //Indicates a date value (yyyymmdd) (DBTYPE_DBDATE).
const adDBTime = 134; //Indicates a time value (hhmmss) (DBTYPE_DBTIME).
const adDBTimeStamp = 135; //Indicates a date/time stamp (yyyymmddhhmmss plus a fraction in billionths) (DBTYPE_DBTIMESTAMP).
const adChapter = 136; //Indicates a four-byte chapter value that identifies rows in a child rowset (DBTYPE_HCHAPTER).
const adPropVariant = 138; //Indicates an Automation PROPVARIANT (DBTYPE_PROP_VARIANT).
const adVarNumeric = 139; //Indicates a numeric value.
const adVarChar = 200; //Indicates a string value.
const adLongVarChar = 201; //Indicates a long string value.
const adVarWChar = 202; //Indicates a null-terminated Unicode character string.
const adLongVarWChar = 203; //Indicates a long null-terminated Unicode string value.
const adVarBinary = 204; //Indicates a binary value.
const adLongVarBinary = 205; //Indicates a long binary value.


function parseField(field, value, sDecimal, parseDateTime) {
    debug('field: %j', field);

    let fReplaceDecimal = sDecimal !== '.';
    let resValue;

    switch (field.Type) {
        // Unsigned int
        case adUnsignedBigInt:
        case adUnsignedInt:
        case adUnsignedSmallInt:
        case adUnsignedTinyInt:
            resValue = Number(value);
            break;

        // Integers
        case adInteger:
        case adBigInt:
        case adSmallInt:
        case adTinyInt:
        case adSingle:
            resValue = Number(value);
            break;

        // Floats
        case adNumeric:
        case adDecimal:
        case adDouble:
        case adCurrency:
        case adVarNumeric:
            resValue = Number(fReplaceDecimal ? value.replace(sDecimal,'.') : value);
            break;

        // Strings
        case adChar:
        case adLongVarChar:
        case adLongVarWChar:
        case adVarChar:
        case adVarWChar:
        case adWChar:
            resValue = value;
            break;

        // Boolean
        case adBoolean:
            resValue = !(value === '0');
            break;

        // Dates
        case adDate:
        case adDBDate:
        case adDBTime:
        case adDBTimeStamp:
            resValue = parseDateTime(value);
            //FIXME перенести проверку в parseDateFn
            if (isNaN(resValue.getTime())) resValue = null;
            break;

        //Прочие
        default:
            // console.warn('Unknown field type', field);
            resValue = value;
    }

    return resValue;
}

module.exports = parseField;