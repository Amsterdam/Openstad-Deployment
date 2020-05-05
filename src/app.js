const express   = require('express');
const session   = require('express-session');
const grant     = require('grant-express');
const nunjucks  = require('nunjucks');
const path      = require('path');
const cookieParser                = require('cookie-parser');
const bodyParser                  = require('body-parser');

const MemoryStore = session.MemoryStore;

const app = express();
const nunjucksEnv = nunjucks.configure('src/views', { autoescape: true, express: app });
app.set('view engine', 'html');

const csurf = require('csurf');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
    sameSite: true
  }
});

const addCsrfGlobal = (req, res, next) => {
  req.nunjucksEnv.addGlobal('csrfToken', req.csrfToken());
  next();
};

const sessionConfig = {
  saveUninitialized : true,
  resave            : true,
  secret            : 'grant',
  store             : new MemoryStore(),
  key               : 'authorization.sid',
  cookie            : {
    maxAge: 122222, //config.session.maxAge,
    secure: false,//process.env.COOKIE_SECURE_OFF ===  'yes' ? false : true,
    httpOnly: false, //process.env.COOKIE_SECURE_OFF ===  'yes' ? false : true,
    sameSite: false, //process.env.COOKIE_SECURE_OFF ===  'yes' ? false : true
  },
};

// REQUIRED: any session store - see /examples/handler-express
app.use(session(sessionConfig));

app.set('port', process.env.PORT || 8888);
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res, next) => {
  res.render('screen/start', {});
});

// mount grant
app.use(grant({
  "defaults": {
    "origin": process.env.ORIGIN,
    "transport": "session",
    "state": true
  },
  "digitalocean": {
    "key": process.env.DIGITAL_OCEAN_CLIENT_ID,
    "secret": process.env.DIGITAL_OCEAN_CLIENT_SECRET,
    "redirect_url": process.env.ORIGIN + '/callback/digitalocean',
    "scope": ["read", "write"],
    "response_type": "code",
    "callback": "/verified"
  },
}));

app.get('/verified', (req, res, next) => {
  const token = req.session.token;

  res.render('screen/settings', {
    session: req.session
  });
});

app.use(function(err, req, res, next){
  console.log('===> err', err);

  // use the error's status or default to 500
  res.status(err.status || 500);

  // send back json data
  res.send({
    message: err.message
  })
});

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

// for dev allow http
app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
