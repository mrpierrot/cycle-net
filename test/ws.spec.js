
require('babel-polyfill');

import { makeNetDriver, wsClient, wsServer } from '../src/index';
import { run } from '@cycle/run';
import Websocket from 'ws';
import assert from 'assert';
import { makeFakeReadDriver, vdom } from './utils';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

import xs from 'xstream';

describe('ws', function () {

    this.timeout(10000);

    it('default', function (done) {

        function main(sources) {

            const { socketServer, socketClient, fake } = sources;

            const wss = socketServer.select('server');
            const client = socketClient.select('client');
            const serverConnection$ = wss.events('connection');
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

            const output$ = clientReady$.map(({ socket })  => socket.events('message')).flatten();

            const clientCreate$ = wss.events('ready').mapTo({
                id: 'client',
                action: 'create',
                url: 'ws://localhost:2001'
            })

            const clientClose$ = xs.of({
                 id:'client',
                 action: 'close'
             })

            const serverCreate$ = xs.of({
                id: 'server',
                action: 'create',
                config: {
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
            socketServer: makeNetDriver(wsServer(Websocket.Server)),
            socketClient: makeNetDriver(wsClient(Websocket)),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                assert.equal(outgoing.data, 'ready')
                
            }, done, 1)
        }
        run(main, drivers);

    });

});