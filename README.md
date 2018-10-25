# Cycle Net

Driver and router component for manage HTT(P)/WS(S)/socket.io services with Cycle.js

## Installation with NPM

`npm i cycle-net --save`

## HTTP/HTTPS Driver

### `makeNetDriver(httpServer(config))`

Create the driver

**Arguments**

- `config` with specifics options
  - `middlewares : Array` : array of [express compatible middlewares](http://expressjs.com/en/guide/using-middleware.html)    like [serveStatic](https://github.com/expressjs/serve-static) or [bodyParser](https://github.com/expressjs/body-parser)
  - `render: (template) => template` : a template engine renderer, call with `req.response.render(template)`

#### Basic usage

```js

const {run} = require('@cycle/run');
const { makeNetDriver, httpServer } = require('cycle-net');

function main(sources){

  const {httpServer} = sources;

  const sinks = {

  }
  return sinks;
}

const drivers = {
  httpServer: makeNetDriver(httpServer())
}

run(main,drivers)

```

### Create a HTTP Server Instance

To create a server instance, we need to send a config stream to the httpServer output.
Like this :

```js
    const httpCreate$ = xs.of({
        id: 'http',
        action: 'create',
        config:{
            port: 1983
        }
    });

    const sinks = {
       httpServer: httpCreate$
    }
```

**create action config:**

- `id` : the instance reference name. Needed to select the server stream on input.
- `action:'create'` : the action name
- `config.port` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
- `config.hostname` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
- `config.backlog` : see [server.listen([port][, hostname][, backlog][, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback)
- `config.handle` : see [server.listen(handle[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_handle_callback)
- `config.path` : see [server.listen(path[, callback]) on NodeJS Api](https://nodejs.org/api/http.html#http_server_listen_path_callback)
- `secured` : set at true to create a HTTPS server.
- `securedConfig` : Needed if `secured`is `true` see [Node HTTPS createServer options](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
- `middlewares : Array` : array of [express compatible middlewares](http://expressjs.com/en/guide/using-middleware.html)    like [serveStatic](https://github.com/expressjs/serve-static) or [bodyParser](https://github.com/expressjs/body-parser)

**Basic example with HTTPS**

```js
     const securedConfig = {
        key: fs.readFileSync(`${__dirname}/certs/key.pem`),
        cert: fs.readFileSync(`${__dirname}/certs/cert.pem`)
    };

    const httpsCreate$ = xs.of({
        id: 'https',
        action: 'create',
        config:{
            port: 1984
        },
        secured: true,
        securedConfig
    });

```

### Close server instance

To close a server instance we need to send a config stream to the httpServer output.

```js
    const httpClose$ = fake.mapTo({
        action: 'close',
        id: 'http',
    });

    const sinks = {
       httpServer: httpClose$
    }
```

**create action config:**

- `id` : the instance reference name. Needed to select the server stream on input.
- `action:'close'` : the action name

### Select a server stream with `select(id)`

Select the server width this specific `id`

**Return Object**

```js
   const http = httpServer.select('http');
```

### Get events with `event(name)`

Get event with `name` stream from a `http`object.

```js
   const http = httpServer.select('http');
   const httpReady$ = http.events('ready');
   const httpRequest$ = http.events('request');
```
**Return Stream**

#### Event `ready`

Dispatched when the server is ready to listen.

**Returned values :**
- `event` : `'ready'`
- `instanceId` : The instance id
- `instance` : the original Node.js server object

#### Event `request`

Dispatched when the server received a request.
See `Request` object above.

### `Request` object

#### Properties

- `event` : `'request'`,
- `instanceId` : The instance id
- `original` : original NodeJS request object,
- `url` : request's url,
- `method` : request's method (POST,GET,PUT, etc...),
- `headers` : request's headers,
- `body` : the body request. `undefined`by default. See [BodyParser middleware](https://github.com/expressjs/body-parser)
- `response` : the response object

### `Response`object

#### Methods

##### `send()`

Format response for driver output.

###### Arguments

- `content` : the body response
- `options` :
 - `statusCode` : default `200`
 - `headers` : default `null`
 - `statusMessage` : default `null`

**Return formatted object for driver output**

##### `json()`

Format response in json.
See `send()`

##### `text()`

Format response in plain text.
See `send()`

##### `html()`

Format response in html.
See `send()`

##### `render()`

Format response with the render engine defined in `makeHttpServerDriver()` options.

##### `redirect()`

Format response redirection for driver output.

###### Arguments

- `path` : path to redirect
- `options` :
 - `statusCode` : default `302`
 - `headers` : default `null`
 - `statusMessage` : default `null`

**Return formatted object for driver output**

### Basic Usage

```js

const {run} = require('@cycle/run');
const { makeNetDriver, httpServer } = require('cycle-net');


function main(sources){

  const {httpServer} = sources;

  // get http source
  const http = httpServer.select('http');
  // get requests
  const serverRequest$ = http.events('request');

  // create the http server
  const httpCreate$ = xs.of({
    id: 'http',
    action: 'create',
    config:{
        port: 1983
    }
  });

  // response formated with a helper response object
  // Response in text format : 'covfefe'
  const response$ = serverRequest$.map( req => req.response.text('covfefe') );

  const sinks = {
    httpServer: xs.merge(httpCreate$,response$)
  }
  return sinks;
}

const drivers = {
    httpServer: makeNetDriver(httpServer())
}

run(main,drivers)

```

## Routing

A Router component using [switch-path](https://github.com/staltz/switch-path)

**Arguments**

`Router(sources,routes)`

- `sources` :  Cycle.js sources object with a specific source `request$`, a stream of http(s) requests.
- `routes` : a collection of routes. See [switch-path](https://github.com/staltz/switch-path)

**Return stream**

### Example

```js
    const { makeNetDriver, httpServer, httpRouter } = require('cycle-net');

    function main(sources) {
        const { httpServer } = sources;

        // get http source
        const http = httpServer.select('http');

        // create the http server
        const httpCreate$ = xs.of({
            id: 'http',
            action: 'create',
            config:{
                port: 1983
            }
        });

        // get requests
        const httpsServerRequest$ = https.events('request');

        const httpsRouter$ = httpRouter({ ...sources, request$: httpsServerRequest$ }, {
            '/': sources => Page({ ...sources, props$: xs.of({ desc: 'home' }) }),
            '/user/:id': id => sources => Page(Object.assign({}, sources, { props$: xs.of({ desc: `user/${id}` }) })),
        });

        const sinks = {
            httpServer: xs.merge(httpCreate$, router$.map(c => c.httpServer).flatten()),
        };
        return sinks;
    }

     function Page(sources) {
        const { request$, props$ = xs.of({ appPath: null }) } = sources;
        const sinks = {
            httpResponse:  xs.combine(props$, request$).map(([props, req]) => req.response.text(props.desc))
        }
        return sinks;
    }

```

## Cooking with middlewares

Here are discribed two usefull express middlewares.

### [serveStatic](https://github.com/expressjs/serve-static)

It is used to serve static files ( images, css, etc... )

**Basic usage**

```js
const serveStatic = require('serve-static');
const { makeNetDriver, httpServer } = require('cycle-net');

const drivers = {
  httpServer: makeNetDriver(httpServer({middlewares:[serveStatic('./public')]})
}

```

### [bodyParser](https://github.com/expressjs/body-parser)

It is used to parse request body and return a full formated body.

**Basic usage**

```js
const bodyParser = require('body-parser');
const { makeNetDriver, httpServer } = require('cycle-net');

const drivers = {
  httpServer: makeNetDriver(httpServer({
      middlewares: [
          // two parsers used to format body POST request in json
          bodyParser.urlencoded({ extended: true }),
          bodyParser.json()
      ]
  })
}

```

## Using [Snabbdom](https://github.com/snabbdom/snabbdom)

Snabbdom is the Virtual DOM using by @cycle/dom. It's possible to use it in server side with [snabbdom-to-html](https://github.com/snabbdom/snabbdom-to-html).

A small helper to use `snabbdom` with `cycle-node-http-server`

```js
  const snabbdomInit = require('snabbdom-to-html/init');
  const snabbdomModules = require('snabbdom-to-html/modules');
  const { makeNetDriver, httpServer } = require('cycle-net');

  export default function vdom(modules=[
          snabbdomModules.class,
          snabbdomModules.props,
          snabbdomModules.attributes,
          snabbdomModules.style
      ]){
      return snabbdomInit(modules);
  }

  const drivers = {
    httpServer: makeNetDriver(httpServer({
        render: vdom()
    })
  }

```
In `main` function, snabbdom used with JSX

```js
  const response$ = request$.map( req => req.response.render(
    <div>
      Pouet
    </div>
  ))

```

## More examples

at https://github.com/mrpierrot/cycle-net/tree/master/test

## Socket.io examples

at https://github.com/mrpierrot/cycle-net/blob/master/test/io.spec.js

## Websocket examples

at https://github.com/mrpierrot/cycle-net/blob/master/test/ws.spec.js

## License

**MIT**

