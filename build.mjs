#!/usr/bin/env -S node --experimental-modules
import fs from 'fs-extra';
import path from 'path';

import cheerio from 'cheerio';
import lodash from 'lodash';
import chalk from 'chalk';

async function main(){

  const configuration = await fs.readJson('./configuration.json');
  console.log(configuration);

  await copyAssets(configuration);
  await renderFiles(configuration);

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
      const rendered = await renderFile(original);
      //console.log(rendered)
      //await fs.writeFile(path.join(configuration.destination, filename))
  }
}

async function renderFile(html){
  const $ = cheerio.load(html,{xml:{normalizeWhitespace: true}});

  $('p > a > img').each(function(i, elem) {

    const imageHref = $(this).attr('src');
    let youtubeId = null;
    const match = imageHref.match(/http:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/0.jpg$/)
    if(match){
      youtubeId = match[1];
      $(this).parent().parent().html(`<div class="widget youtube" data-id="${youtubeId}"></div>`)
    }else{
      console.log('Unable to extract id from ', imageHref);
    }
    //console.log(youtubeId, imageHref);

  });

  return $.root().html();
}
