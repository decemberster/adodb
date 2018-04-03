'use strict';
const debug = require('debug')('adodb:parseDate');

function parse_MMddyyyy_HHmmss(value, dSplitter, tSplitter) {
    if (value.length < 11) value += ' ' + '00' + tSplitter + '00' + tSplitter + '00';

    let dateTimeStrings = value.split(' ');
    let dateString = dateTimeStrings[0].trim();
    let timeString = dateTimeStrings[1].trim();

    let dateParts = dateString.split(dSplitter);
    let timeParts = timeString.split(tSplitter);

    let dayOfMonth = Number(dateParts[1]),
        month = Number(dateParts[0]),
        year = Number(dateParts[2]),
        hours = Number(timeParts[0]),
        minutes = Number(timeParts[1]),
        seconds = Number(timeParts[2]);

    return new Date(year, month - 1, dayOfMonth, hours, minutes, seconds);
}

function parse_yyyyMMdd_HHmmss(value, dSplitter, tSplitter) {
    if (value.length < 11) value += ' ' + '00' + tSplitter + '00' + tSplitter + '00';

    let i,
        s,
        dayOfMonth = 1,
        month = 0,
        year = 0,
        hours = 0,
        minutes = 0,
        seconds = 0;

    if (value.trim() === '') return null;

    debug('%s', value);
    if (value.length > 0) {
        // year;
        i = value.indexOf(dSplitter);
        if (i !== -1) {
            s = value.slice(0, i);
            year = Number(s);
            value = value.slice(i + 1);
        } else {
            year = Number(value);
            value = '';
        }
    }

    debug('%s', value);
    if (value.length > 0) {
        // month;
        i = value.indexOf(dSplitter);
        s = value.slice(0, i);
        month = Number(s);
        value = value.slice(i + 1);
    }

    debug('%s', value);
    if (value.length > 0) {
        // dayOfMonth;
        i = value.indexOf(' ');
        s = value.slice(0, i);
        dayOfMonth = Number(s);
        value = value.slice(i + 1);
    }

    debug('%s', value);
    if (value.length > 0) {
        // hours;
        i = value.indexOf(tSplitter);
        s = value.slice(0, i);
        hours = Number(s);
        value = value.slice(i + 1);
    }

    debug('%s', value);
    if (value.length > 0) {
        // minutes;
        i = value.indexOf(tSplitter);
        s = value.slice(0, i);
        minutes = Number(s);
        value = value.slice(i + 1);
    }

    debug('%s', value);
    if (value.length > 0) {
        // seconds;
        seconds = Number(value);
    }

    debug(
        'year=%d, month=%d, dayOfMonth=%d, hours=%d, minutes=%d, seconds=%d',
        year,
        month,
        dayOfMonth,
        hours,
        minutes,
        seconds
    );
    return new Date(year, month - 1, dayOfMonth, hours, minutes, seconds);
}

function parse_ddMMyyyy_HHmmss(value, dSplitter, tSplitter) {
    if (value.length < 11) value += ' ' + '00' + tSplitter + '00' + tSplitter + '00';

    let i,
        s,
        dayOfMonth = 1,
        month = 0,
        year = 0,
        hours = 0,
        minutes = 0,
        seconds = 0;

    if (value.trim() === '') return null;

    if (value.length > 0) {
        // dayOfMonth;
        i = value.indexOf(dSplitter);
        s = value.slice(0, i);
        dayOfMonth = Number(s);
        value = value.slice(i + 1);
    }

    if (value.length > 0) {
        // month;
        i = value.indexOf(dSplitter);
        s = value.slice(0, i);
        month = Number(s);
        value = value.slice(i + 1);
    }

    if (value.length > 0) {
        // year;
        i = value.indexOf(' ');
        if (i !== -1) {
            s = value.slice(0, i);
            year = Number(s);
            value = value.slice(i + 1);
        } else {
            year = Number(value);
            value = '';
        }
    }

    if (value.length > 0) {
        // hours;
        i = value.indexOf(tSplitter);
        s = value.slice(0, i);
        hours = Number(s);
        value = value.slice(i + 1);
    }

    if (value.length > 0) {
        // minutes;
        i = value.indexOf(tSplitter);
        s = value.slice(0, i);
        minutes = Number(s);
        value = value.slice(i + 1);
    }

    if (value.length > 0) {
        // seconds;
        seconds = Number(value);
    }

    return new Date(year, month - 1, dayOfMonth, hours, minutes, seconds);
}

function parseDateTimeFn(sShortDate, sTimeFormat) {
    debug('parseDateTimeFn, sShortDate: <%s>, sTimeFormat: <%s>', sShortDate, sTimeFormat);
    let sDTFormat = sShortDate + ' ' + sTimeFormat;

    if (/d{1,2}\.M{1,2}\.y{3,4} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '.', ':');
        return value => parse_ddMMyyyy_HHmmss(value, '.', ':');
    } else if (/d{1,2}\/M{1,2}\/y{3,4} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '/', ':');
        return value => parse_ddMMyyyy_HHmmss(value, '/', ':');
    } else if (/d{1,2}-M{1,2}-y{3,4} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '-', ':');
        return value => parse_ddMMyyyy_HHmmss(value, '-', ':');
    } else if (/y{3,4}-M{1,2}-d{1,2} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '-', ':');
        return value => parse_yyyyMMdd_HHmmss(value, '-', ':');
    } else if (/M{1,2}\/d{1,2}\/y{3,4} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '/', ':');
        return value => parse_MMddyyyy_HHmmss(value, '/', ':');
    } else if (/M{1,2}\.d{1,2}\.y{3,4} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '.', ':');
        return value => parse_MMddyyyy_HHmmss(value, '.', ':');
    } else if (/M{1,2}-d{1,2}-y{3,4} H{1,2}:m{1,2}:s{1,2}/.test(sDTFormat)) {
        debug('date format splitter: <%s>, time format splitter: <%s>', '-', ':');
        return value => parse_MMddyyyy_HHmmss(value, '-', ':');
    } else {
        // console.warn(
        //     'Can\'t parse datetime of format "%s", try setting "yyyy-MM-dd" for date and "hh:mm:ss" for time in Windows Control Panel',
        //     sDTFormat
        // );
        return value => value;
    }
}

module.exports = parseDateTimeFn;
