
require('babel-polyfill');
import delay from 'xstream/extra/delay';
import { makeNetDriver, httpServer } from '../src/index';
const { run } = require('@cycle/run');

const assert = require('assert');
const { makeFakeReadDriver, vdom } = require('./utils');
const { makeHTTPDriver } = require('@cycle/http');
const xs = require('xstream').default;
const fs = require('fs');
const bodyParser = require('body-parser');
const { html } = require('snabbdom-jsx');

const securedConfig = {
    key: fs.readFileSync(`${__dirname}/certs/key.pem`),
    cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('http', function () {

    this.timeout(10000);

    it('http init with one get request', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.text('pouet'));

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                config:{
                    port: 1983
                }
            });

            const httpClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$, httpClose$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer()),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });



    it('https init with get request', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const https = httpServer.select('https');
            const serverReady$ = https.events('ready');
            const serverRequest$ = https.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.text('pouet'));

            const request$ = serverReady$.map(() => ({
                url: 'https://127.0.0.1:1984',
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const httpsCreate$ = xs.of({
                id: 'https',
                action: 'create',
                config:{
                    port: 1984
                },
                secured: true,
                securedConfig
            });

            const httpsClose$ = fake.mapTo({
                action: 'close',
                id: 'https',
            })

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpsCreate$, httpsClose$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer()),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('http init and https init with get request', function (done) {

        function main(sources) {
            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const https = httpServer.select('https');
            const httpServerReady$ = http.events('ready');
            const httpsServerReady$ = https.events('ready');
            const httpServerRequest$ = http.events('request');
            const httpsServerRequest$ = https.events('request');
            const httpServerResponse$ = httpServerRequest$.map(req => req.response.text('pouet'));
            const httpsServerResponse$ = httpsServerRequest$.map(req => req.response.text('pouet'));

            const httpRequest$ = httpServerReady$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const httpsRequest$ = httpsServerReady$.map(() => ({
                url: 'https://127.0.0.1:1984',
                category: 'foo-secured'
            }));

            const httpResponse$ = HTTP.select('foo').flatten();
            const httpsResponse$ = HTTP.select('foo-secured').flatten();

            const serverCreate$ = xs.from([
                {
                    id: 'http',
                    action: 'create',
                    config:{
                        port: 1983
                    }
                }, {
                    id: 'https',
                    action: 'create',
                    config:{
                        port: 1984
                    },
                    secured: true,
                    securedConfig
                }
            ]);

            const httpClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const httpsClose$ = fake.mapTo({
                action: 'close',
                id: 'https',
            });

            const sinks = {
                fake: xs.combine(httpResponse$, httpsResponse$),
                httpServer: xs.merge(serverCreate$, httpClose$, httpsClose$, httpServerResponse$, httpsServerResponse$),
                HTTP: xs.merge(httpRequest$, httpsRequest$)
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer()),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver(([httpResponse, httpsResponse], i, complete) => {
                if (httpResponse.text) {
                    assert.equal(httpResponse.text, 'pouet')
                }
                if (httpsResponse.text) {
                    assert.equal(httpsResponse.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('http init with one post request using a middleware', function (done) {

        const DATA_SENT = {
            cov: 'fefe',
            foo: 'bar',
        };

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.json(DATA_SENT));

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1985',
                method: 'POST',
                send: DATA_SENT,
                category: 'foo'
            }));

            const response$ = HTTP.select('foo').flatten();

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                config:{
                    port: 1985
                }
            });

            const httpClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$, httpClose$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer({
                middlewares: [
                    bodyParser.urlencoded({ extended: true }),
                    bodyParser.json()
                ]
            })),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, JSON.stringify(DATA_SENT));
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('http init with one get request and rendering with snabbdom', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.render(
                <div>pouet</div>
            ));

            const request$ = serverReady$.map(() => ({
                url: 'http://127.0.0.1:1986',
                category: 'foo'
            }));

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
                config:{
                    port: 1986
                }
            });

            const httpClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const response$ = HTTP.select('foo').flatten();

            const sinks = {
                fake: response$,
                httpServer: xs.merge(httpCreate$, httpClose$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer({ render: vdom() })),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, '<div>pouet</div>')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

    it('double http init in the same port would fail', function (done) {

        function main(sources) {

            const { httpServer, fake } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready').replaceError(e => xs.of(e));

            const httpCreate$ = xs.from([{
                id: 'http-1',
                action: 'create',
                config:{
                    port: 2048
                }
            },
            {
                id: 'http-2',
                action: 'create',
                config:{
                    port: 2048
                }
            }]);

            const httpClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const sinks = {
                fake: serverReady$,
                httpServer: xs.merge(httpCreate$, httpClose$),
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer()),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                assert.equal(outgoing.event,'error');
            }, done, 1)
        }
        run(main, drivers); 

    });

     it('http init with separate listen action', function (done) {

        function main(sources) {

            const { httpServer, fake, HTTP } = sources;

            const http = httpServer.select('http');
            const serverReady$ = http.events('ready').debug(o => console.log('ready'));
            const serverListening$ = http.events('listening');
            const serverRequest$ = http.events('request');
            const serverResponse$ = serverRequest$.map(req => req.response.text('pouet'));

            

            const response$ = HTTP.select('foo').flatten();

            const httpCreate$ = xs.of({
                id: 'http',
                action: 'create',
               
            });

            const httpListen$ = serverReady$
                .map(
                ({id,server}) => ({
                    id,
                    server,
                    action: 'listen',
                    config:{
                        port: 1983
                    }
                })
            )

            const request$ = serverListening$.map(() => ({
                url: 'http://127.0.0.1:1983',
                category: 'foo'
            }));

            const httpClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const sinks = {
                fake: xs.combine(serverListening$,response$),
                httpServer: xs.merge(httpCreate$,httpListen$, httpClose$, serverResponse$),
                HTTP: request$
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer()),
            HTTP: makeHTTPDriver(),
            fake: makeFakeReadDriver(([serverListening,outgoing], i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });



});