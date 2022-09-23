// Generated by ReScript, PLEASE EDIT WITH CARE


var defaultRestApi = "https://api.fullstack.cash/v5/";

var bitcoincash = require("./bitcoincash");

var crypto = require("./crypto");

var until = require("./util");

var blockchain = require("./blockchain");

var control = require("./control");

var generating = require("./generating");

var mining = require("./mining");

var rawTransactions = require("./raw-transactions");

var mnemonic = require("./mnemonic");

var address = require("./address");

var hdNode = require("./hdnode");

var transactionBuilder = require("./transaction-builder");

var ecPair = require("./ecpair");

var script = require("./script");

var price = require("./price");

var schnorr = require("./schnorr");

var slp = require("./slp/slp");

var encryption = require("./encryption");

var utxo = require("./utxo");

var transaction = require("./transaction");

var dsProof = require("./dsproof");

var eCash = require("./ecash");

var electrumx = require("./electrumx");

var psfSlpIndexer = require("./psf-slp-indexer");

function constructor(config) {
  var restURL;
  if (config !== undefined) {
    restURL = config;
  } else {
    var url = process.env.RESTURL;
    restURL = url !== undefined ? url : defaultRestApi;
  }
  var apiToken = config !== undefined ? config : process.env.BCHJSTOKEN;
  var authPass = config !== undefined ? config : process.env.BCHJSAUTHPASS;
  var combined = "fullstackcash:" + authPass + "";
  var base64Credential = Buffer.from(combined).toString("base64");
  var authToken = "Basic " + base64Credential + "";
  var libConfig = {
    restURL: restURL,
    apiToken: apiToken,
    authToken: authToken
  };
  var match = new Electrumx(libConfig);
  if (match !== 22) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            136,
            8
          ],
          Error: new Error()
        };
  }
  var match$1 = new Control(libConfig);
  if (match$1 !== 4) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            137,
            8
          ],
          Error: new Error()
        };
  }
  var match$2 = new Mining(libConfig);
  if (match$2 !== 6) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            138,
            8
          ],
          Error: new Error()
        };
  }
  var match$3 = new RawTransactions(libConfig);
  if (match$3 !== 7) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            139,
            8
          ],
          Error: new Error()
        };
  }
  var match$4 = new Address(libConfig);
  if (match$4 !== 9) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            140,
            8
          ],
          Error: new Error()
        };
  }
  var match$5 = new Blockchain(libConfig);
  if (match$5 !== 3) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            141,
            8
          ],
          Error: new Error()
        };
  }
  var match$6 = new Encryption(libConfig);
  if (match$6 !== 17) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            142,
            8
          ],
          Error: new Error()
        };
  }
  var match$7 = new Generating(libConfig);
  if (match$7 !== 5) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            143,
            8
          ],
          Error: new Error()
        };
  }
  var match$8 = new HDNode(libConfig);
  if (match$8 !== 10) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            144,
            8
          ],
          Error: new Error()
        };
  }
  var match$9 = new Mnemonic(libConfig);
  if (match$9 !== 8) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            145,
            8
          ],
          Error: new Error()
        };
  }
  var match$10 = new Price(libConfig);
  if (match$10 !== 14) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            146,
            8
          ],
          Error: new Error()
        };
  }
  var match$11 = new Script(libConfig);
  if (match$11 !== 13) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            147,
            8
          ],
          Error: new Error()
        };
  }
  var match$12 = new Util(libConfig);
  if (match$12 !== 2) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            148,
            8
          ],
          Error: new Error()
        };
  }
  var match$13 = new Schnorr(libConfig);
  if (match$13 !== 15) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            149,
            8
          ],
          Error: new Error()
        };
  }
  var match$14 = new SLP(libConfig);
  if (match$14 !== 16) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            150,
            8
          ],
          Error: new Error()
        };
  }
  var match$15 = new Utxo(libConfig);
  if (match$15 !== 18) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            151,
            8
          ],
          Error: new Error()
        };
  }
  var match$16 = new Transaction(libConfig);
  if (match$16 !== 19) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            152,
            8
          ],
          Error: new Error()
        };
  }
  var match$17 = new DSProof(libConfig);
  if (match$17 !== 20) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            153,
            8
          ],
          Error: new Error()
        };
  }
  var match$18 = new Ecash(libConfig);
  if (match$18 !== 21) {
    throw {
          RE_EXN_ID: "Match_failure",
          _1: [
            "BchRe.res",
            154,
            8
          ],
          Error: new Error()
        };
  }
  var match$19 = new PsfSlpIndexer(libConfig);
  if (match$19 >= 23) {
    return ;
  }
  throw {
        RE_EXN_ID: "Match_failure",
        _1: [
          "BchRe.res",
          155,
          8
        ],
        Error: new Error()
      };
}

var BCHJS = {
  constructor: constructor
};

export {
  defaultRestApi ,
  bitcoincash ,
  crypto ,
  until ,
  blockchain ,
  control ,
  generating ,
  mining ,
  rawTransactions ,
  mnemonic ,
  address ,
  hdNode ,
  transactionBuilder ,
  ecPair ,
  script ,
  price ,
  schnorr ,
  slp ,
  encryption ,
  utxo ,
  transaction ,
  dsProof ,
  eCash ,
  electrumx ,
  psfSlpIndexer ,
  BCHJS ,
}
/* bitcoincash Not a pure module */
