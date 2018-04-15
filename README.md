BETA

## Что это

Это Node.js пакет для выполнения SQL-запросов к базам данных MS Access. Предназначен для использования
на Windows XP и старше. В режиме "клиент-сервер" клиентская часть может использоваться без ограничения операционной
системы.

## Зачем это

Для подключения из приложений Node.js к базам данных в формате MS Access.

## Какие есть аналоги?

[node-adodb](https://github.com/nuintun/node-adodb). Идея подключения из Node.js к ADODB.Connection через
JScript почерпнута оттуда. Настоящий пакет фактически является переделкой node-adodb, c целью добавления новых
возможностей и устраненния недостатков.

## Как это устроено?

Node.js запускает (spawn) процесс Windows Script Host для выполнения небольшого JScript, который фактически и выполняет
SQL-запрос с помощью ADODB.Connection. Данные между процессами передаются через стандартные потоки ввода-вывода: stdin,
stdout, sterr.

## Системные требования

Windows XP, 7, Vista, 8, 8.1, 10, Node.js v.4.x (более старшие версии Node.js не тестировались, поскольку не работают на Windows XP),
Microsoft.Jet.OLEDB.4.0. В случае использования пакета в режиме "клиент-сервер" системные требования действительны для
только серверной части. Клиентская часть не использует специфичный для Windows код.

## Дополнительные возможности

1.  Расширен синтаксис SQL:
    1.  разрешены комментарии в коде
    1.  TODO несколько операторов через ";" (multiple statements)
1.  Работа в режиме клиент-сервер.
1.  Турбо-режим, т.е. использование Recordset.GetString() вместо Recordset.MoveNext(), что значительно ускоряет выполнение
    SQL-запросов, особенно с большим количеством столбцов. Применять турбо-режим можно только с оговоркой, что в
    возвращаемых данных гарантировано отсутствует символ табуляции (символ табуляции используется процедурой
    Recordset.GetString() для разделения строк и столбцов). TODO Отлючение турбо-режима для применения
    пакета без оговорок.
1.  TODO Потоковый (stream) режим возвращения результатов SQL-запроса.

## Использование

### Обычный (файловый) режим

TODO

### Клиент-серверный режим

#### Серверная часть
##### Установить серверную часть

    C:\>npm install adodb -g
    C:\>mkdir adodb-config
    C:\>cd adodb-config
    C:\adodb-config>adodb run
    ADODB_PATH: undefined
    config file: C:\adodb\adodb-config.json
    opened server on {"address":"::","family":"IPv6","port":4023}
    Ctrl+C
    ^CЗавершить выполнение пакетного файла [Y(да)/N(нет)]? y

В текущем каталоге будет создан файл `adodb-config.json`.
Его небходимо отредактировать, указав порт и строку подключения к базе данных MS Access.
При наличии системной переменной `ADODB_PATH` файл `adodb-config.json` будет создан в каталоге,
указанном этой системной переменной.

##### Запустить сервер для проверки настроек:

    C:\adodb-config>adodb run

##### Проверить работу сервера

    C:\>telnet localhost 4023
    connStr: Provider=Microsoft.Jet.OLEDB.4.0;Data Source=Data Source=C:\node487\node_modules\adodb\test\media\Northwind2003.mdb
    endStr: END{6251729b-82fb-4b89-9bf8-d550c78acd3f}
    LOCALS
    {"OEMCP":"866","ACP":"1251","sDecimal":",","sShortDate":"yyyy-MM-dd","sTimeFormat":"H:m:s"}
    END{6251729b-82fb-4b89-9bf8-d550c78acd3f}
    testing db connection: OK


    CTRL+]
    Microsoft Telnet> q
    C:\>

##### Установить сервер как сервис windows

    C:\adodb-config>adodb install

##### Удалить ранее установленный сервис windows

    C:\adodb-config>adodb uninstall

##### Полный список команд

    C:\adodb-config>adodb
