"use strict";
const m3u8stream = require('m3u8stream');
const ytsr = require("ytsr");
const ytpl = require("ytpl");
const miniget = require("miniget");
const express = require("express");
const ejs = require("ejs");
const app = express();
const axios = require('axios');
const fs = require('fs');
const { https } = require('follow-redirects');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const InvidJS = require('@invidjs/invid-js');
const jp = require('jsonpath');
const path = require('path');
const bodyParser = require('body-parser');


const limit = process.env.LIMIT || 50;

const user_agent = process.env.USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36";
　
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


//ログイン
// 読み込み時ちぇっく
app.use((req, res, next) => {
    if (req.cookies.wakamemassiro !== "ok" && !req.path.includes("login")) {
      const randomNum = Math.floor(Math.random() * 5);

      if (randomNum === 0) {
        let referer = req.get("Referer") || "No referer information";
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        res.render("../views/tst/2.ejs", { ip: ip });
      } else {lse {
         if (req.cookies.massiropass !== 'ok' && !req.path.includes('login')) {
           return res.redirect('/login');
         } else{
           next();
         }
    }
   } else{
       next();
   }
});
//ログイン済み？
app.get('/login/if', async (req, res) => {
    if (req.cookies.massiropass !== 'ok') {
        res.render('login', { error: 'ログインしていません。もう一度ログインして下さい' })
    } else {
        return res.redirect('/');
    }
});
// ログインページ
app.get('/login', (req, res) => {
    let referer = req.get('Referer') || 'No referer information';
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    let response3 = axios.get("https://wakamecomment.glitch.me");
    console.log(`URL: ${referer} から来た, IP: ${ip}`);
    res.render('login', { error: null });
});
// パスワード確認
app.post('/login', (req, res) => {
    const password = req.body.password;
    if (password === 'harusame' || password === '114514Kiju' || password === '810Kiju') {
        res.cookie('massiropass', 'ok', { maxAge: 5 * 24 * 60 * 60 * 1000, httpOnly: true });
        return res.redirect('/');
    } else {
         if (password === 'ohana') {
               return res.redirect('https://ohuaxiehui.webnode.jp');
         } else {
               res.render('login', { error: 'パスワードが間違っています。もう一度お試しください。' });
    }
    }
});
//パスワードを忘れた場合
app.get('/login/forgot', (req, res) => {
  res.render(`login/forgot.ejs`);
});
//共有用
app.get('/login/guest/:id', async (req, res) => {
  let videoId = req.params.id;
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  const apiUrl = `https://wakametubeapi.glitch.me/api/w/${videoId}`;
  
  try {
    const response = await axios.get(apiUrl);
    const { stream_url } = response.data;
    
    res.render('login/guest.ejs', { videoId, stream_url});
  } catch (error) { 
    console.error(error);
    res.status(500).render('login/matte.ejs', { videoId, error: '動画を取得できません', details: error.message });
  }
});
//ログアウト
app.post('/logout', (req, res) => {
    res.cookie('pass', 'false', { maxAge: 1, httpOnly: true });
    return res.redirect('/login');
});

//tst
app.get('/tst/:id', (req, res) => {
  const id = req.params.id;
  res.render(`tst/${id}`, { id: id });
});

//曲をきく！
app.get("/famous",(req, res) => {
  res.render("../views/famous.ejs")
})

//直接狙った！
// Invidiousのリスト
const invidiousInstances = [
  "https://inv.nadeko.net",
  "https://iv.datura.network",
  "https://invidious.jing.rocks","https://invidious.reallyaweso.me",
  "https://inv.phene.dev","https://invidious.protokolla.fi",
  "https://invidious.perennialte.ch",
  "https://invidious.materialio.us","https://yewtu.be",
  "https://invidious.fdn.fr",
  "https://inv.tux.pizza",
  "https://invidious.drgns.space","https://vid.puffyan.us",
  "https://vid.puffyan.us","https://inv.riverside.rocks",
  "https://invidio.xamh.de","https://y.com.sb",
  "https://invidious.sethforprivacy.com",
  "https://invidious.tiekoetter.com",
  "https://inv.bp.projectsegfau.lt",
  "https://inv.vern.cc",
  "https://invidious.nerdvpn.de","https://invidious.private.coffee"
];

//invidiousから引っ張ってくる
async function fetchVideoInfoParallel(videoId) {
  const requests = invidiousInstances.map(instance =>
    axios.get(`${instance}/api/v1/videos/${videoId}`)
      .then(response => {
        console.log(`使用したURL: ${instance}/api/v1/videos/${videoId}`);
        return response.data;
      })
  );

  return Promise.any(requests);
}

//レギュラー
app.get('/w/:id', async (req, res) => {
  const videoId = req.params.id;

  try {
    const videoInfo = await fetchVideoInfoParallel(videoId);
    
    const formatStreams = videoInfo.formatStreams || [];
    const streamUrl = formatStreams.reverse().map(stream => stream.url)[0];

    if (!streamUrl) {
          res.status(500).render('matte', { 
      videoId, 
      error: 'ストリームURLが見つかりません',
    });
    }
    if (!videoInfo.authorId) {
      return res.redirect(`/redirect?p=w&id=${videoId}`);
    }
    
    const templateData = {
      stream_url: streamUrl,
      videoId: videoId,
      channelId: videoInfo.authorId,
      channelName: videoInfo.author,
      channelImage: videoInfo.authorThumbnails?.[videoInfo.authorThumbnails.length - 1]?.url || '',
      videoTitle: videoInfo.title,
      videoDes: videoInfo.descriptionHtml,
      videoViews: videoInfo.viewCount,
      likeCount: videoInfo.likeCount
    };

    res.render('infowatch', templateData);
  } catch (error) {
        res.status(500).render('matte', { 
      videoId, 
      error: '動画を取得できません', 
      details: error.message 
    });
  }
});

//高画質再生！！
app.get('/www/:id', async (req, res) => {
  const videoId = req.params.id;
  try {
    const videoInfo = await fetchVideoInfoParallel(videoId);
    
    const audioStreams = videoInfo.adaptiveFormats || [];
    let streamUrl = audioStreams
      .filter(stream => stream.container === 'mp4' && stream.resolution === '1080p')
      .map(stream => stream.url)[0];
    
    if (!streamUrl) {
    let streamUrl = audioStreams
      .filter(stream => stream.container === 'mp4' && stream.resolution === '720p')
      .map(stream => stream.url)[0];
    }
    
    const audioUrl = audioStreams
      .filter(stream => stream.container === 'm4a' && stream.audioQuality === 'AUDIO_QUALITY_MEDIUM')
      .map(stream => stream.url)[0];

    const templateData = {
      stream_url: streamUrl,
      audioUrl: audioUrl,
      videoId: videoId,
      channelId: videoInfo.authorId,
      channelName: videoInfo.author,
      channelImage: videoInfo.authorThumbnails?.[videoInfo.authorThumbnails.length - 1]?.url || '',
      videoTitle: videoInfo.title,
      videoDes: videoInfo.descriptionHtml,
      videoViews: videoInfo.viewCount,
      likeCount: videoInfo.likeCount
    };

    res.render('highquo', templateData);
  } catch (error) {
        res.status(500).render('matte', { 
      videoId, 
      error: '動画を取得できません', 
      details: error.message 
    });
  }
});

//音だけ再生
app.get('/ll/:id', async (req, res) => {
  const videoId = req.params.id;

  try {
    const videoInfo = await fetchVideoInfoParallel(videoId);
    
    const audioStreams = videoInfo.formatStreams || [];
    const streamUrl = audioStreams.map(audio => audio.url)[0];

    if (!streamUrl) {
          res.status(500).render('matte', { 
      videoId, 
      error: 'ストリームURLが見つかりません',
    });
    }
    if (!videoInfo.authorId) {
      return res.redirect(`/redirect?p=ll&id=${videoId}`);
    }

    const templateData = {
      audioUrl: streamUrl,
      videoId: videoId,
      channelId: videoInfo.authorId,
      channelName: videoInfo.author,
      channelImage: videoInfo.authorThumbnails?.[videoInfo.authorThumbnails.length - 1]?.url || '',
      videoTitle: videoInfo.title,
      videoDes: videoInfo.descriptionHtml,
      videoViews: videoInfo.viewCount
    };

    res.render('listen', templateData);
  } catch (error) {
        res.status(500).render('matte', { 
      videoId, 
      error: '動画を取得できません', 
      details: error.message 
    });
  }
});

//ダウンロード
app.get('/pytdf/:id', async (req, res) => {
  const videoId = req.params.id;

  try {
    const videoInfo = await fetchVideoInfoParallel(videoId);

    const formatStreams = videoInfo.formatStreams || [];
    const streamUrl = formatStreams.reverse().map(stream => stream.url)[0];

    if (!streamUrl) {
          res.status(500).render('matte', { 
      videoId, 
      error: 'ストリームURLが見つかりません',
    });
    }
    
    https.get(streamUrl, (streamResponse) => {
      if (streamResponse.statusCode !== 200) {
        res.status(streamResponse.statusCode).send(`Failed to download video. Status code: ${streamResponse.statusCode}`);
        return;
      }

      res.setHeader('Content-Disposition', `attachment; filename="wakame.mp4"`);
      res.setHeader('Content-Type', 'video/mp4');

      streamResponse.pipe(res);
    }).on('error', (err) => {
      res.status(500).send(`Request error: ${err.message}`);
    });
  } catch (error) {
    res.status(500).send(`Failed to retrieve stream URL: ${error.message}`);
  }
});

// ホーム
app.get("/", (req, res) => {
   res.sendFile(__dirname + "/views/index.html");
});

// サーチ
app.get("/s", async (req, res) => {
	let query = req.query.q;
	let page = Number(req.query.p || 1);
	if (!query) return res.redirect("/");
    let cookies = parseCookies(req);
    let wakames = cookies.wakames === 'true';
    if (wakames) {
        try {
		res.render("search2.ejs", {
			res: await ytsr(query, { limit, pages: page }),
			query: query,
			page
		});
	} catch (error) {
		console.error(error);
		try {
			res.status(500).render("error.ejs", {
				title: "ytsr Error",
				content: error
			});
		} catch (error) {
			console.error(error);
		}
	}
    } else {
       try {
		res.render("search.ejs", {
			res: await ytsr(query, { limit, pages: page }),
			query: query,
			page
		});
	} catch (error) {
		console.error(error);
		try {
			res.status(500).render("error.ejs", {
				title: "ytsr Error",
				content: error
			});
		} catch (error) {
			console.error(error);
		}
	}
    }
});

//プレイリスト
app.get("/p/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	let page = Number(req.query.p || 1);
	try {
		res.render("playlist.ejs", {
			playlist: await ytpl(req.params.id, { limit, pages: page }),
			page
		});
	} catch (error) {
		console.error(error);
		res.status(500).render("error.ejs", {
			title: "ytpl Error",
			content: error
		});
	}
});

// チャンネル
app.get("/c/:id", async (req, res) => {
	if (!req.params.id) return res.redirect("/");
	let page = Number(req.query.p || 1);
	try {
		res.render("channel.ejs", {
			channel: await ytpl(req.params.id, { limit, pages: page }),
			page
		});
	} catch (error) {
		console.error(error);
		res.status(500).render("error.ejs",{
			title: "ytpl Error",
			content: error
		});
	}
});

// サムネ読み込み
app.get("/vi*", (req, res) => {
	let stream = miniget(`https://i.ytimg.com/${req.url.split("?")[0]}`, {
		headers: {
			"user-agent": user_agent
		}
	});
	stream.on('error', err => {
		console.log(err);
		res.status(500).send(err.toString());
	});
	stream.pipe(res);
});

// 画像読み込み
app.get("/ytc/*", (req, res) => {
	let stream = miniget(`https://yt3.ggpht.com/${req.url}`, {
		headers: {
			"user-agent": user_agent
		}
	});
	stream.on('error', err => {
		console.log(err);
		res.status(500).send(err.toString());
	});
	stream.pipe(res);
});

//tool
app.get("/tool",(req, res) => {
  res.render("../tool/n/home.ejs")
})
app.get('/tool/:id', (req, res) => {
  const id = req.params.id;
  res.render(`../tool/${id}.ejs`, { id: id });
});

//tst
app.get("/tst1234",(req, res) => {
  res.render("../tst.ejs")
})

//urlでYouTube動画を探す
app.get("/urls",(req, res) => {
  res.render("../views/url.ejs")
})

//blog
app.get("/blog",(req, res) => {
  res.render("../views/blog.ejs")
})
app.get('/blog/:id', (req, res) => {
  const id = req.params.id;
  res.render(`blog/${id}`, { id: id });
});

//お問い合わせ
app.get("/send",(req, res) => {
  res.render("../views/send.ejs")
})

//apps
app.get("/app",(req, res) => {
  res.render("../public/apps.ejs")
})

//game
app.get('/game/:id', (req, res) => {
  const id = req.params.id;
  res.render(`../game/${id}.ejs`, { id: id });
});

//proxy
app.get("/proxy/",(req, res) => {
  res.render("../read/proxy.ejs")
})

//設定
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

function parseCookies(request) {
    const list = {};
    const cookieHeader = request.headers.cookie;

    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            let parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
    }

    return list;
}

app.get('/setting', (req, res) => {
    const cookies = parseCookies(req);
    const wakames = cookies.wakames === 'true';
    res.render('setting.ejs', { wakames });
});

app.post('/setting', (req, res) => {
    const wakames = req.body.wakames === 'on';
    res.setHeader('Set-Cookie', `wakames=${wakames}; HttpOnly; Max-Age=604800`);
    res.redirect('/setting');
});

//proxy
app.get('/proxy/:id', (req, res) => {
  const id = req.params.id;
  res.render(`../read/proxy/${id}.ejs`, { id: id });
});

//曲
app.get('/songs/rainbow', async (req, res) => {
  let videoId = "RMZNjFkJK7E";
  
  try {
    const videoInfo = await fetchVideoInfoParallel(videoId);
    const streamUrl = "https://cdn.glitch.me/e7208106-7973-47a2-8d4b-9fdc27b708a0/rainbow.mp4?v=1726103047477";
    
    const templateData = {
      stream_url: streamUrl,
      videoId: videoId,
      channelId: videoInfo.authorId,
      channelName: videoInfo.author,
      channelImage: videoInfo.authorThumbnails?.[videoInfo.authorThumbnails.length - 1]?.url || '',
      videoTitle: videoInfo.title,
      videoDes: videoInfo.descriptionHtml,
      videoViews: videoInfo.viewCount,
      likeCount: videoInfo.likeCount
    };

    res.render('infowatch', templateData);
  } catch (error) {
    console.error(error);
    res.status(500).render('matte', { videoId, error: '動画を取得できません', details: error.message });
  }
});

//html取得
app.get('/gethtml/:encodedUrl', async (req, res) => {
  const { encodedUrl } = req.params;
  
  const replacedUrl = decodeURIComponent(encodedUrl);
  
  const url = replacedUrl.replace(/\.wakame02\./g, '.');

  if (!url) {
    return res.status(400).send('URLが入力されていません');
  }
  
  try {
    const response = await axios.get(url);
    const html = response.data;
    res.setHeader('Content-Type', 'text/plain');
    res.send(html);
  } catch (error) {
    res.status(500).send('URLの取得に失敗しました');
  }
});

//ページを拾ってくる
app.get('/getpage/:encodedUrl', async (req, res) => {
  const { encodedUrl } = req.params;
  
  const replacedUrl = decodeURIComponent(encodedUrl);
  
  const url = replacedUrl.replace(/\.wakame02\./g, '.');

  if (!url) {
    return res.status(400).send('URLが入力されていません');
  }
  
  try {
    const response = await axios.get(url);
    const html = response.data;
    res.send(html);
  } catch (error) {
    res.status(500).send('URLの取得に失敗しました');
  }
});

//動画再生用リダイレクト
app.get('/wredirect/:id', (req, res) => {
  const id = req.params.id;
  res.redirect(`/w/${id}`);
});

//概要欄用リダイレクト
app.get('/watch', (req, res) => {
  const videoId = req.query.v;
  if (videoId) {
    res.redirect(`/w/${videoId}`);
  } else {
    res.redirect(`/`);
  }
});
app.get('/channel/:id', (req, res) => {
  const id = req.params.id;
    res.redirect(`/c/${id}`);
});
app.get('/channel/:id/join', (req, res) => {
  const id = req.params.id;
  res.redirect(`/c/${id}`);
});

//リダイレクト
app.get('/redirect', (req, res) => {
  const subp = req.query.p;
  const id= req.query.id;
  if (id) {
    res.redirect(`/${subp}/${id}`);
  } else {
    res.redirect(`/${subp}`);
  }
});

//偽エラー画面
app.get("/block/cc3q",(req, res) => {
    let referer = req.get('Referer') || 'No referer information';
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.render('../views/tst/2.ejs', { ip: ip });
})

//くえすちおん
// 質問ページ
app.get('/question', (req, res) => {
    res.render('../views/question/que.ejs');
});

// 選択肢の処理
app.post('/question/answer', (req, res) => {
    if (req.body.option === 'classroom') {
        res.redirect('/question/class');
    } else if (req.body.option === 'massiro') {
        res.redirect('/question/massiro');
    }
});

// クラスルーム
app.get('/question/class', (req, res) => {
    res.render('../views/question/class.ejs');
});

app.post('/question/class/answer', (req, res) => {
    if (req.body.answer === 'うぇうぇ（ヘッドホン太郎は神）') {
        res.cookie('wakamemassiro', 'ok', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.redirect('/');
    } else {
        res.redirect('/block/cc3q');
    }
});

// まっしろ
app.get('/question/massiro', (req, res) => {
    res.render('../views/question/massiro.ejs');
});

app.post('/question/massiro/answer', (req, res) => {
    if (req.body.answer === '【悠久の絆】主人公＆マリユス') {
        res.cookie('wakamemassiro', 'ok', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.redirect('/');
    } else {
        res.redirect('/block/cc3q');
    }
});

// エラー
app.use((req, res) => {
	res.status(404).render("error.ejs", {
		title: "404 Not found",
	});
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is now listening on port", listener.address().port);
});

process.on("unhandledRejection", console.error);

