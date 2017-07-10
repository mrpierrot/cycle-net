
require('babel-polyfill');

import { makeNetDriver, ioClient, ioServer,httpServer } from '../src/index';
import { run } from '@cycle/run';
import Server from 'socket.io';
import Client from 'socket.io-client';
import assert from 'assert';
import { makeFakeReadDriver, vdom } from './utils';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

import xs from 'xstream';

describe('io', function () {

    this.timeout(10000);

    it('default', function (done) {

        function main(sources) {

            const { socketServer, socketClient, fake } = sources;

            const server = socketServer.select('server');
            const client = socketClient.select('client');
            const serverConnection$ = server.events('connection');
            const serverReady$ = server.events('ready');
            const clientReady$ = client.events('ready');

            const serverMessage$ = serverConnection$.map(({ socket }) =>
                xs.merge(
                    socket.events('message').map(({ data }) => socket.send(data)),
                    xs.of(socket.send('ready'))
                )
            ).compose(flattenConcurrently);

            const clientMessage$ = clientReady$.map(({ socket }) =>
                xs.merge(
                    //socket.events('message').map(({ data }) => socket.send(data)),
                    xs.of(socket.send('covfefe'))
                )
            ).compose(flattenConcurrently);

            const output$ = clientReady$.map(({ socket }) => socket.events('message')).flatten();

            const clientCreate$ = serverReady$.mapTo({
                id: 'client',
                action: 'create',
                url: 'ws://localhost:2001'
            })

            const clientClose$ = fake.mapTo({
                id: 'client',
                action: 'close'
            })

            const serverCreate$ = xs.of({
                id: 'server',
                action: 'create',
                config:{
                    port: 2001
                }
            });

            const serverClose$ = fake.mapTo({
                action: 'close',
                id: 'server',
            });

            const sinks = {
                fake: output$,
                socketServer: xs.merge(serverCreate$, serverClose$, serverMessage$),
                socketClient: xs.merge(clientCreate$, clientClose$, clientMessage$)
            }

            return sinks;
        }

        const drivers = {
            socketServer: makeNetDriver(ioServer(Server)),
            socketClient: makeNetDriver(ioClient(Client)),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                assert.equal(outgoing.data, 'ready')

            }, done, 1)
        }
        run(main, drivers);

    });

    it('over http', function (done) {

        function main(sources) {

            const { socketServer, socketClient, fake, httpServer } = sources;

            const http = httpServer.select('http');
            const server = socketServer.select('server');
            const client = socketClient.select('client');
            const serverConnection$ = server.events('connection');
            const httpServerReady$ = http.events('ready');
            const serverReady$ = server.events('ready');
            const clientReady$ = client.events('ready');

            const serverMessage$ = serverConnection$.map(({ socket }) =>
                xs.merge(
                    socket.events('message').map(({ data }) => socket.send(data)),
                    xs.of(socket.send('ready'))
                )
            ).compose(flattenConcurrently);

            const clientMessage$ = clientReady$.map(({ socket }) =>
                xs.merge(
                    //socket.events('message').map(({ data }) => socket.send(data)),
                    xs.of(socket.send('covfefe'))
                )
            ).compose(flattenConcurrently);

            const output$ = clientReady$.map(({ socket }) => socket.events('message')).flatten();

            const httpServerCreate$ = xs.of({
                id: 'http',
                action: 'create',
                config:{
                    port: 2001
                }
            });

            const clientCreate$ = serverReady$.mapTo({
                id: 'client',
                action: 'create',
                url:'http://localhost:2001'
            });

            const clientClose$ = fake.mapTo({
                id: 'client',
                action: 'close'
            })

            const serverCreate$ = httpServerReady$.map( ({server}) => ({
                id: 'server',
                action: 'create',
                config:{
                    server
                }
            }));

            const serverClose$ = fake.mapTo({
                action: 'close',
                id: 'server',
            });

            const httpServerClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const sinks = {
                fake: output$,
                httpServer: xs.merge(httpServerCreate$,httpServerClose$),
                socketServer: xs.merge(serverCreate$, serverClose$, serverMessage$),
                socketClient: xs.merge(clientCreate$, clientClose$, clientMessage$)
            }

            return sinks;
        }

        const drivers = {
            httpServer: makeNetDriver(httpServer()),
            socketServer: makeNetDriver(ioServer(Server)),
            socketClient: makeNetDriver(ioClient(Client)),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                assert.equal(outgoing.data, 'ready')

            }, done, 1)
        }
        run(main, drivers);

    });

});