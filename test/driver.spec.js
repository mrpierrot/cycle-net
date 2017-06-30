
require('babel-polyfill');

import { makeWSServerDriver, makeWSClientDriver } from '../src/index';
import { run } from '@cycle/run';
import Websocket from 'ws';
import assert from 'assert';
import { makeFakeReadDriver, vdom } from './utils';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

import xs from 'xstream';

describe('driver', function () {

    this.timeout(10000);

    it('', function (done) {

        function main(sources) {

            const { socketServer,socketClient, fake } = sources;

            const wss = socketServer.select('ws');
            const client = socketClient.select('client');
            const serverConnection$ = wss.events('connection');
            const socket$ = client.events('ready').map( ({socket}) => socket);

            const serverMessage$ = serverConnection$.map(({ socket }) =>
                xs.merge(
                    socket.events('message').map( ({data}) => socket.send(data)),
                    xs.of(socket.send('ready'))
                )
            ).compose(flattenConcurrently);

            const clientMessage$ = socket$.map( socket => 
                xs.merge(
                    socket.events('message').map( ({data}) => socket.send(data) ),
                    xs.of(socket.send('covfefe'))
                )
            ).compose(flattenConcurrently);

            const clientCreate$ = wss.events('ready').mapTo({
                id:'client',
                action: 'create',
                url:'ws://localhost:2001'
            })

           /* const clientClose$ = xs.of({
                id:'client',
                action: 'close'
            })*/

            const serverCreate$ = xs.of({
                id: 'ws',
                action: 'create',
                config: {
                    port: 2001
                }
            });

            const serverClose$ = fake.mapTo({
                action: 'close',
                id: 'http',
            });

            const sinks = {
                //fake: response$,
                socketServer: xs.merge(serverCreate$, serverClose$, serverMessage$),
                socketClient: xs.merge(clientCreate$,clientMessage$)
            }

            return sinks;
        }

        const drivers = {
            socketServer: makeWSServerDriver(Websocket.Server),
            socketClient: makeWSClientDriver(Websocket),
            fake: makeFakeReadDriver((outgoing, i, complete) => {
                if (outgoing.text) {
                    assert.equal(outgoing.text, 'pouet')
                }
            }, done, 1)
        }
        run(main, drivers);

    });

});