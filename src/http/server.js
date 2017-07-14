
import xs from 'xstream';
import { applyMiddlewares, basicEventFilter } from '../commons';
import { createRequestWrapper } from './request';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

function formatListeningOptions(config) {

    return !config ? [] :
        typeof (config.handle) === 'object' ? [config.handle] :
            typeof (config.path) === 'string' ? [config.path] :
                (config.port || config.hostname || config.backlog) ? [config.port, config.hostname, config.backlog] :
                    []
}

function makeProducer(rootMiddlewares = [], render = v => v) {

    const http = require('http');
    const https = require('https');

    return function createServerProducer(cfg) {
        let server;

        const { id, secured = false, config = {}, securedConfig = {}, middlewares = [] } = cfg;

        const createServerFunc = secured ?
            (callback) => https.createServer(securedConfig, callback) :
            (callback) => http.createServer(callback);

        const listenArgs = formatListeningOptions(config)

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
                if (listenArgs.length > 0) {
                    server.listen.apply(server, [...listenArgs, () => {
                        listener.next({
                            event: 'ready',
                            id,
                            server
                        })
                    }])
                } else {
                    setTimeout(() => {
                        listener.next({
                            event: 'ready',
                            id,
                            server
                        })
                    },1)

                }


            },

            stop() {
                server.close();
            }
        }
    }
}

function makeListenProducer({ id, server, config }) {
    const listenArgs = formatListeningOptions(config);
    return {
        start(listener) {
            server.listen.apply(server, [...listenArgs, () => {
                listener.next({
                    event: 'listening',
                    id,
                    server
                })
            }])
        },
        stop() {

        }
    }
}

function sendAction({ res, content, headers = null, statusCode = 200, statusMessage = null }) {
    res.writeHead(statusCode, statusMessage || '', headers);
    res.end(content);
}

function customAction(input$) {
    return input$.filter(o => o.action == 'listen').map(
        (data) => xs.create(makeListenProducer(data))
    ).compose(flattenConcurrently);
}

export function httpServer({ middlewares, render } = {}) {
    return {
        producer: makeProducer(middlewares, render),
        sendAction: sendAction,
        eventFilter: basicEventFilter,
        customAction
    }
}