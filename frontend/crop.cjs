const Jimp = require('C:\\temp_jimp\\node_modules\\jimp');

async function run() {
  const img = await Jimp.read('C:\\Users\\avina\\.gemini\\antigravity-ide\\brain\\d078e4fd-123b-41df-9e27-6512452f0e0c\\.user_uploaded\\media_1787333266975.png');
  
  // Crop the left white square icon
  const fav = img.clone().crop(140, 700, 220, 220);
  await fav.writeAsync('c:\\Users\\avina\\Downloads\\jvm-visualizer\\frontend\\public\\favicon.png');
  await fav.writeAsync('c:\\Users\\avina\\Downloads\\jvm-visualizer\\frontend\\public\\logo.png');
}
run();
