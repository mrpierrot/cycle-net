
import xs from 'xstream';
import { applyMiddlewares, basicEventFilter } from '../commons';
import { createRequestWrapper } from './request';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

function makeProducer(rootMiddlewares=[], render = v => v) {

    const http = require('http');
    const https = require('https');

    return function createServerProducer(cfg) {
        let server;

        const { id, secured = false, config = {}, securedConfig = {}, middlewares = [] } = cfg;

        const createServerFunc = secured ?
            (callback) => https.createServer(securedConfig, callback) :
            (callback) => http.createServer(callback);

        const listenArgs = typeof (config.handle) === 'object' ? config.handle :
            typeof (config.path) === 'string' ? config.path :
                [config.port, config.hostname, config.backlog]

        return {
            start(listener) {
                server = createServerFunc((req, res) => applyMiddlewares([...rootMiddlewares, ...middlewares], req, res).then(() => {
                    listener.next(createRequestWrapper(id, req, res, render))
                }));
                server.on('error', (e) => {
                    listener.error({
                        event: 'error',
                        error: e,
                        id
                    })
                })

                server.listen.apply(server, [...listenArgs, () => {
                    listener.next({
                        event: 'ready',
                        id,
                        server
                    })
                }])

            },

            stop() {
                server.close();
            }
        }
    }
}

function sendAction({ res, content, headers = null, statusCode = 200, statusMessage = null }) {
    res.writeHead(statusCode, statusMessage || '', headers);
    res.end(content);
}

export function httpServer({ middlewares, render } = {}) {
    return {
        producer: makeProducer(middlewares, render),
        sendAction: sendAction,
        eventFilter: basicEventFilter
    }
}