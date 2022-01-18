const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');
var shell = require('shelljs');
var path = require('path');
var getDirName = require('path').dirname;
var mkdirp = require('mkdirp');

const download = function (uri, filename, callback) {
  request.head(encodeURI(uri), function (err, res, body) {
    mkdirp(getDirName(filename), function (err) {
      if (err) return cb(err);
      request(encodeURI(uri)).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
  });
};

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const urls = [
  // '/blog/',
  // '/blog/?avia-element-paging=2',
  '/blog/?avia-element-paging=3'


]



urls.reverse(); //reverse array order because we are using the pop method

const domain = "https://thepainexpertsofarizona.com";

scrape(urls, "", []);
function scrape(urls, blogIndexContent, blogUrls) {
  sleep(1000).then(() => { //set limiter time here
    if (urls.length > 0) {
      rp(domain + urls.pop()).then(function (html) {

        /* SET INDIVIDUAL BLOG URLS HERE */
        let blogUrl = "";
        var $ = cheerio.load(html)
        $(".slide-entry-title a:first-of-type", html).each(function () {
          blogUrl = $(this).attr("href");
          blogUrl = blogUrl.replace('https://thepainexpertsofarizona.com', '');
          blogUrls.push(blogUrl);

        });

        blogIndexContent += "<div>";

        /* SET BLOG IMAGE HERE */
        $(".slide-entry img", html).each(function () {
          const img = $(this).attr("data-src"); //change whether lazy loaded or not
          const newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
          const newImgPath = __dirname + newImgUrl;
          download(img, newImgPath, function () { });
          blogIndexContent += `
          <p class="text-center"><a href="${blogUrl}"><img src='${newImgUrl}' /></p></a>`;
        });

        $(".entry-title", html).each(function () {
          const indexHeader = $(this).text();
          blogIndexContent += `<h3 class="text-center title-sm">${indexHeader} </h3>`;
        })

        /* SET BLOG INDEX CONTENT ITEMS HERE */
        $(".entry-content", html).each(function () {
          entryContent = $(this).text();
          blogIndexContent += `<p class="text-center">${entryContent} </p>`;

        });

        blogIndexContent += "</div>";

        scrape(urls, blogIndexContent, blogUrls);
      });
    }

    else if (blogUrls.length > 0) {
      newBlogUrl = blogUrls.pop();
      console.log(newBlogUrl)
      rp(domain + newBlogUrl).then(function (html) {


        /* SET BLOG CONTENT ITEMS HERE */
        var $ = cheerio.load(html)
        const title = $("title", html).text();

        const seodesc = $("meta[name='description']", html).attr("content");

        const h1 = $("h1 .post-title", html).text(); //change based on the title of the blog post on the page
        let content = $(" .post-entry .entry-content-wrapper .entry-content", html).html(); //set based on the content blog for the blog html on the page

        /* DOWNLOAD ALL IMAGES */
        $img = $.load(content);
        $img(".entry-content img").each(function () {
          const img = $img(this).attr("data-src");
          //change whether lazy loaded or not
          const newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
          const newImgPath = __dirname + newImgUrl;
          download(img, newImgPath, function () { });
          $img(this).attr("src", newImgUrl);
        });


        // content = content.replace("data-src","src"); //do this if the images are lazy loaded

        WritePage(title, seodesc, h1, $img.html(), newBlogUrl);
        scrape(urls, blogIndexContent, blogUrls);
      })
    }
    else {
      WritePage("Blog", "", "Blog", blogIndexContent, "/blog/");
      console.log("we did it - we're heroes");
    }
  });

}


function WritePage(title, seodesc, h1, content, newBlogUrl) {
  let phpfile = `
  <?php
  $seotitle = "${title}";
  $seodesc = "${seodesc}";
  $section = "blog";
  ?>

  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/header.php" ?>

  <section class="masthead bg-image animate zoomOutBg" style="--bgImage: url(/assets/img/masthead/home.jpg);">
    <div class="container pv50">
      <div class="pv200">
        <h1 class="title-xl text-center mb10 white animate fadeIn">${h1}</h1>
      </div>
    </div>
  </section>


  <section class="mv100">
    <div class="container">
      <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/logos.php" ?>
    </div>
  </section>

  <section class="mv100">
    <div class="container">
      <div class="mw1200">
        ${content}

      </div>
    </div>
  </section>

  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/request-consult.php" ?>
  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/footer.php" ?>

  <script>
  </script>`;

  console.log(__dirname)
  shell.mkdir('-p', __dirname + newBlogUrl);

  const wstream = fs.createWriteStream(__dirname + newBlogUrl + '/index.php');
  wstream.write(phpfile);
  wstream.end();
}
