const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const Fa = require("react-icons/fa");
const Gi = require("react-icons/gi");

const OUT = path.join(__dirname, "assets");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// name -> [IconComponent, color hex (no #)]
const ICONS = {
  coin_white: [Gi.GiTwoCoins, "FFFFFF"],
  coin_gold: [Gi.GiTwoCoins, "F2A900"],
  link_white: [Fa.FaLink, "FFFFFF"],
  contract_white: [Fa.FaFileContract, "FFFFFF"],
  shield_white: [Fa.FaShieldAlt, "FFFFFF"],
  cap_white: [Fa.FaGraduationCap, "FFFFFF"],
  bank_white: [Fa.FaLandmark, "FFFFFF"],
  store_white: [Fa.FaStore, "FFFFFF"],
  route_white: [Fa.FaRoute, "FFFFFF"],
  chart_white: [Fa.FaChartLine, "FFFFFF"],
  users_white: [Fa.FaUsers, "FFFFFF"],
  calendar_white: [Fa.FaRegCalendarAlt, "FFFFFF"],
  book_white: [Fa.FaBookOpen, "FFFFFF"],
  warn_white: [Fa.FaExclamationTriangle, "FFFFFF"],
  check_white: [Fa.FaCheckCircle, "FFFFFF"],
  server_white: [Fa.FaServer, "FFFFFF"],
  lock_white: [Fa.FaLock, "FFFFFF"],
  database_white: [Fa.FaDatabase, "FFFFFF"],
  cogs_white: [Fa.FaCogs, "FFFFFF"],
  laptop_white: [Fa.FaLaptopCode, "FFFFFF"],
  wallet_white: [Fa.FaWallet, "FFFFFF"],
  network_white: [Fa.FaProjectDiagram, "FFFFFF"],
  cubes_white: [Fa.FaCubes, "FFFFFF"],
  arrowdown_navy: [Fa.FaLongArrowAltDown, "142857"],
  arrowright_navy: [Fa.FaLongArrowAltRight, "142857"],
  times_white: [Fa.FaTimesCircle, "FFFFFF"],
  quote_navy: [Fa.FaQuoteLeft, "142857"],
};

async function run() {
  for (const [name, [Icon, color]] of Object.entries(ICONS)) {
    const svg = ReactDOMServer.renderToStaticMarkup(
      React.createElement(Icon, { color: `#${color}`, size: 256 })
    );
    const full = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 512 512">${svg.replace(
      /<svg[^>]*>|<\/svg>/g,
      ""
    )}</svg>`;
    const buf = await sharp(Buffer.from(full)).png().toBuffer();
    fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
    console.log("wrote", name);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
