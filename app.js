var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { AuthenticationClient } = require('authing-js-sdk');
const authing = new AuthenticationClient({
  appId: 'APP_ID',
  secret: 'APP_SECRET',
  appHost: 'https://{你的域名}.authing.cn',
  redirectUri: 'http://localhost:5000/callback'
});

const session = require('express-session');
var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'a very long random string',
  resave: true,
  saveUninitialized: false
}));

app.use('/', indexRouter);
// 发起登录
app.get('/login', async (req, res) => {
  const url = authing.buildAuthorizeUrl();
  res.redirect(url);
})
// 处理回调
app.get('/callback', async (req, res) => {
  const { code } = req.query
  const tokenSet = await authing.getAccessTokenByCode(code);
  const { access_token, id_token } = tokenSet;
  const userInfo = await authing.getUserInfoByAccessToken(access_token);
  req.session.user = { ...userInfo, tokenSet };
  res.redirect('/');
})
// 从当前系统登出，从 Authing 登出
app.get('/logout', async (req, res) => {
  const url = authing.buildLogoutUrl({ expert: true, idToken: req.session.user.tokenSet.id_token, redirectUri: 'http://localhost:5000' });
  req.session.destroy();
  res.redirect(url);
})
// 受保护的路由
app.get('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login')
  }
  res.send(JSON.stringify(req.session.user, null, 4))
})
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
