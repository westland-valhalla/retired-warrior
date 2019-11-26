#!/usr/bin/env -S node --experimental-modules
import fs from 'fs-extra';
import path from 'path';

import request from 'request';
import cheerio from 'cheerio';
import lodash from 'lodash';
import chalk from 'chalk';

async function main(){

  const configuration = await fs.readJson('./configuration.json');
  console.log(configuration);

  await renderFiles(configuration);
  await copyAssets(configuration);

}

main();





async function copyAssets(configuration){
  console.log(chalk.yellow('Copying Assets'))
  for(const item of configuration.assets){
      console.log(`Copying ${item.name}`);
      await fs.copy(path.join(configuration.source, item.name), path.join(configuration.destination, item.name))
  }
}

async function renderFiles(configuration){
  console.log(chalk.yellow('Rendering Files'))

  for(const item of configuration.chapters){
      console.log(`Rendering ${item.name}`);
      const filename = item.name + '.html';
      const original = (await fs.readFile(path.join(configuration.source, filename))).toString()

      // let rendered = await patchOldStuff(original, configuration, item);
      let rendered = await renderComponents(original, configuration);
      rendered = await renderQuotes(rendered, configuration);
      rendered = await renderPoems(rendered, configuration);
      rendered = await renderText(rendered, configuration);
      rendered = await renderNavigation(rendered, configuration, item);

      //console.log(rendered)
      await fs.writeFile(path.join(configuration.destination, filename), rendered)
  }

}

async function patchOldStuff(html, configuration, item){
  const $ = cheerio.load(html);

  // $('p > a > img').each(function(i, elem) {
  //
  //   const imageHref = $(this).attr('src');
  //   const imageAlt = $(this).attr('alt');
  //   let youtubeId = null;
  //   const match = imageHref.match(/http:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/0.jpg$/)
  //   if(match){
  //     youtubeId = match[1];
  //     $(this).parent().parent().html(`<div class="widget youtube" data-id="${youtubeId}" data-title="${imageAlt}"></div>`)
  //   }else{
  //     console.log('Unable to extract id from ', imageHref);
  //   }
  //   //console.log(youtubeId, imageHref);
  //
  // });


  function calculateArrows(item){

    let currentIndex = configuration.chapters.indexOf(item);
    let previousIndex = currentIndex -1;
    let nextIndex = currentIndex +1;

    if(previousIndex<0) previousIndex = 0;
    if(nextIndex>configuration.chapters.length-1)  nextIndex = 0;

    let up = {name:'index', title:'TOC'}
    let previous = configuration.chapters[0];
    let next = configuration.chapters[0];



    previous = configuration.chapters[previousIndex];
    next = configuration.chapters[nextIndex];
    // if(previousIndex>=0){
    // }
    // if(nextIndex>configuration.chapters.length){
    // }

    return [previous, up, next]
  }

  const [previous, up, next] = calculateArrows(item, configuration);
  let currentIndex = configuration.chapters.indexOf(item);

  console.log(`${configuration.chapters.length}) LOCATION = ${item.name}/${currentIndex} ->  [${previous.name}, ${up.name}, ${next.name}]`);

  $('article > nav').each(function(i, elem) {

  // const newHtml = `
  //     <nav aria-label="Page Navigation">
  //       <ul class="pagination pagination-lg justify-content-center">
  //         <li class="page-item">
  //           <a class="page-link" href="${previous.name}.html"><img style="width: 1rem; height:1rem;" src="images/arrow-alt-circle-left.svg"></a>
  //         </li>
  //         <li class="page-item"><a class="page-link" href="${up.name}.html"><img style="width: 1rem; height:1rem;" src="images/arrow-alt-circle-up.svg"></a></li>
  //         <li class="page-item">
  //           <a class="page-link" href="${next.name}.html">${next.title}&nbsp;&raquo;</a>
  //         </li>
  //       </ul>
  //     </nav>
  // `;
  // const newHtml = `
  //     <nav aria-label="Page Navigation">
  //
  //       <p class="py-3">
  //         <a href="${previous.name}.html" class="btn btn-secondary"><img style="width: 1rem; height:1rem;" src="images/arrow-alt-circle-left.svg"> ${previous.title}</a>
  //         <a href="${up.name}.html" class="btn btn-secondary"><img style="width: 1rem; height:1rem;" src="images/list-alt.svg"> ${up.title}</a>
  //       </p>
  //
  //       <p class="py-3">
  //         <a href="${next.name}.html" class="btn btn-lg btn-primary  btn-block">${next.title} <img style="width: 1rem; height:1rem;" src="images/arrow-alt-circle-right.svg"></a>
  //       </p>
  //
  //      </nav>
  // `;
  const newHtml = `
      <div class="widget navigation"></div>
  `;

  //$(this).parent().html(newHtml)


  });

  return $.root().html();
}

async function renderQuotes(html, configuration){
  const $ = cheerio.load(html);
  $('div.widget.quote').each(function(i, elem) {
    const quoteAuthor = $(this).data('author');
    const quoteAuthorUrl = $(this).data('author-url');
    const quoteSource = $(this).data('source');
    const quoteSourceUrl = $(this).data('source-url');
    const quoteText = $(this).html();
    let widgetHtml = `
    <div class="card text-white bg-info shadow-lg">
      <div class="card-body">
        <blockquote class="blockquote mb-0">
          <p>${quoteText}</p>
          <footer class="blockquote-footer"></footer>
        </blockquote>
      </div>
    </div>
    `;
    $(this).html(widgetHtml);
    if(quoteAuthor && quoteAuthorUrl){
      $('.blockquote-footer', this).append(`<a class="text-white" href="${quoteAuthorUrl}">${quoteAuthor}</a>`)
    }else if(quoteAuthor && !quoteAuthorUrl){
      $('.blockquote-footer', this).append(`<span class="text-light">${quoteAuthor}</span>`)
    }
    if(quoteSource && quoteSourceUrl){
      $('.blockquote-footer', this).append(` in <cite title="${quoteSource}"><a class="text-white" href="${quoteSourceUrl}">${quoteSource}</a></cite>`)
    }else if(quoteSource && !quoteSourceUrl){
      $('.blockquote-footer', this).append(` in <cite class="text-light" title="${quoteSource}">${quoteSource}</cite>`)
    }
  })
  return $.root().html();
}


async function renderPoems(html, configuration){
  const $ = cheerio.load(html);
  $('div.widget.poem').each(function(i, elem) {

    const quoteTitle = $(this).data('title');
    const quoteTitleUrl = $(this).data('title-url');

    const quoteAuthor = $(this).data('author');
    const quoteAuthorUrl = $(this).data('author-url');

    const quoteText = $(this).html();
    let widgetHtml = `
    <div class="card text-white bg-success shadow-lg">
      <div class="card-body">

        <h3 class="poem-title pb-3">

        </h3>

        <div class="py-2">
        ${quoteText}
        </div>

      </div>
    </div>
    `;
    $(this).html(widgetHtml);

    if(quoteTitle && quoteTitleUrl){
      $('.poem-title', this).append(` <a class="text-white" href="${quoteTitleUrl}">${quoteTitle}</a>`)
    }else if(quoteTitle && !quoteTitleUrl){
      $('.poem-title', this).append(` <span class="text-light">${quoteTitle}</span>`)
    }

    if(quoteAuthor && quoteAuthorUrl){
      $('.poem-title', this).append(`<small> by <a class="text-light" href="${quoteAuthorUrl}">${quoteAuthor}</a></small>`)
    }else if(quoteAuthor && !quoteAuthorUrl){
      $('.poem-title', this).append(`<small class="text-light"> by ${quoteAuthor}</small>`)
    }

  })
  return $.root().html();
}
async function renderText(html, configuration){
  const $ = cheerio.load(html);
  $('div.widget.text').each(function(i, elem) {

    const quoteTitle = $(this).data('title');
    const quoteText = $(this).html();

    let widgetHtml = `
    <div class="card text-white bg-danger shadow-lg">

    <div class="card-header lead font-weight-bold">${quoteTitle}</div>

      <div class="card-body">
        <div class="py-2 lead">
        ${quoteText}
        </div>
      </div>
    </div>
    `;
    $(this).html(widgetHtml);


  })
  return $.root().html();
}


async function renderNavigation(html, configuration, item){
  const $ = cheerio.load(html);



    function calculateArrows(item){
      let currentIndex = configuration.chapters.indexOf(item);
      let previousIndex = currentIndex -1;
      let nextIndex = currentIndex +1;
      if(previousIndex<0) previousIndex = 0;
      if(nextIndex>configuration.chapters.length-1)  nextIndex = 0;
      let up = {name:'index', title:'TOC'}
      let previous = configuration.chapters[0];
      let next = configuration.chapters[0];
      previous = configuration.chapters[previousIndex];
      next = configuration.chapters[nextIndex];
       return [previous, up, next]
    }

    const [previous, up, next] = calculateArrows(item, configuration);
    let currentIndex = configuration.chapters.indexOf(item);

    //console.log(`${configuration.chapters.length}) LOCATION = ${item.name}/${currentIndex} ->  [${previous.name}, ${up.name}, ${next.name}]`);



  $('div.widget.navigation').each(function(i, elem) {

    const quoteTitle = $(this).data('title');
    const quoteText = $(this).html();

    let widgetHtml = `
        <nav aria-label="Page Navigation">

          <p class="py-3">
            <a href="${previous.name}.html" class="btn btn-secondary"><img style="width: 1rem; height:1rem;" src="images/arrow-alt-circle-left.svg"> ${previous.title}</a>
            <a href="${up.name}.html" class="btn btn-secondary"><img style="width: 1rem; height:1rem;" src="images/list-alt.svg"></a>
          </p>

          <p class="py-3">
            <a href="${next.name}.html" class="btn btn-lg btn-primary  btn-block">${next.title} <img style="width: 1rem; height:1rem;" src="images/arrow-alt-circle-right.svg"></a>
          </p>

         </nav>
    `;
    $(this).html(widgetHtml);


  })
  return $.root().html();
}








async function renderComponents(html, configuration){
  const $ = cheerio.load(html);
  const thumbnailDownloads = [];

  $('div.widget.youtube').each(function(i, elem) {
    const youtubeId = $(this).data('id');
    const youtubeTitle = $(this).data('title');

    // donload thumbnail image
    const thumbUrl = `http://img.youtube.com/vi/${youtubeId}/0.jpg`;
    const saveThumbAs = path.resolve(`${configuration.source}/images/youtube-${youtubeId}.jpg`);
    thumbnailDownloads.push([thumbUrl,saveThumbAs]);



    const widgetHtml = `
      <div class="card text-white bg-dark shadow-lg">
        <div class="card-header">
          ${youtubeTitle}
        </div>
        <div class="card-video">
          <a href="https://www.youtube.com/watch?v=${youtubeId}"><img class="card-img-bottom" src="images/youtube-${youtubeId}.jpg" alt="${youtubeTitle}"></a>
          <img class="video-play" src="images/video-play.png">
        </div>


      </div>
    `;
    $(this).html(widgetHtml);


  });


  for(const [thumbUrl, saveThumbAs] of thumbnailDownloads){
    await downloadYoutubeImage(thumbUrl, saveThumbAs);
  }

  return $.root().html();
}


function downloadYoutubeImage(src, dest){
  return new Promise(async function(resolve, reject) {

    if(await fs.pathExists(dest)) {
      //console.log('already downloaded, exit early',dest);
      resolve();
      return;
    }else{
      //console.log('Downloading %s into %s', src, dest);
    }

    request(src).pipe(fs.createWriteStream(dest)).on('close', function(err){
      if (err) {
        reject(err);
        return;
      }
      resolve()
    });

  });
}
