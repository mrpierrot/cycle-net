
import xs from 'xstream';
import { applyMiddlewares } from '../commons';
import { createRequestWrapper } from './request';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

function makeProducer(rootMiddlewares,render) {
    
    import http from 'http';
    import https from 'https';

    function createServerProducer(cfg) {
        let server;

        const {id, secured, options, securedOptions, middlewares} = cfg;

        const createServerFunc = secured ?
            (callback) => https.createServer(securedOptions, callback) :
            (callback) => http.createServer(callback);

        const listenArgs = typeof (options.handle) === 'object' ? options.handle :
            typeof (options.path) === 'string' ? options.path :
                [options.port, options.hostname, options.backlog]

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



function makeCreateAction(rootMiddlewares, render, stopAction$) {
    return function createAction({ id, secured, securedOptions, port, hostname, backlog, handle, path, middlewares = [] }) {
        const createServerFunc = secured ?
            (callback) => https.createServer(securedOptions, callback) :
            (callback) => http.createServer(callback);
        return xs.create(createServerProducer(id, { port, hostname, backlog, handle, path }, [...rootMiddlewares, ...middlewares], render, createServerFunc))
            .endWhen(stopAction$.filter(o => o.id === id))
    }
}


function sendAction({ res, content, headers = null, statusCode = 200, statusMessage = null }) {
    res.writeHead(statusCode, statusMessage || '', headers);
    res.end(content);
}

export function httpServer(rootMiddlewares,render) {
    return {
        producer: makeProducer(rootMiddlewares,render),
        sendAction: sendAction
    }
}