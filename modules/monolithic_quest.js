const conf = require('../conf/config').setting,
      mongoose = require('mongoose'),
      Quest = require('../models/Quest');

mongoose.Promise = require('bluebird');
mongoose.connect('mongodb+srv://gijoona:mongodb77@cluster-quester-euzkr.gcp.mongodb.net/quester', { promiseLibrary: require('bluebird') })
        .then(() => console.log('connection successful!!!'))
        .catch((err) => console.error(err));

const redis = require('redis').createClient(conf.redis.port, conf.redis.ip);  // redis 모듈 로드
redis.on('error', function (err) {  // Redis 에러 처리
  console.log('Redis Error ' + err);
});

/**
  퀘스트관리 REST API
  퀘스트등록: {
    method: POST,
    url: /quest
    parameter: {
      title: 퀘스트제목,
      userId: 등록유저고유코드(mongodb object id),
      contents: 퀘스트내용,
      powerExp: 힘 경험치,
      staminaExp: 체력 경험치,
      knowledgeExp: 지능 경험치,
      relationExp: 인맥 경험치,
      tags: 구분용 해시태그
    },
    result: {
      errorcode: '에러코드',
      errormessage: '에러메시지'
    }
  }
  퀘스트수정: {
    method: PUT
    url: /quest,
    parameter: {
      _id: 퀘스트고유코드(mongodb object id),
      title: 퀘스트제목,
      contents: 퀘스트내용,
      powerExp: 힘 경험치,
      staminaExp: 체력 경험치,
      knowledgeExp: 지능 경험치,
      relationExp: 인맥 경험치,
      tags: 구분용 해시태그
    },
    result: {
      errorcode: 에러코드
      errormessage: 에러메시지
    }
  }
  퀘스트조회: {
    method: GET,
    url: /quest,
    parameter: {
      userId: 등록유저ID(mongodb object id)
    },
    result: {
      errorcode: '에러코드',
      errormessage: '에러메시지',
      results: [{  //'퀘스트목록'
        _id: '고유코드',
        title: 퀘스트제목,
        userId: '등록자유저고유코드',
        contents: '퀘스트내용',
        powerExp: '힘 경험치'
        staminaExp: 체력 경험치,
        knowledgeExp: 지능 경험치,
        relationExp: 인맥 경험치,
        tags: 구분용 해시태그
      }, ...]
    }
  }
  퀘스트삭제: {
    method: DELETE,
    url: /quest,
    parameter: {
      id: 퀘스트고유코드(mongodb object id)
    },
    result: {
      errorcode: '에러코드',
      errormessage: '에러메시지'
    }
  }
*/
exports.onRequest = function (res, method, pathname, params, cb) {
  // 메서드별로 기능 분기
  switch (method) {
    case 'POST':
      return register(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    case 'GET':
      return inquiry(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    case 'PUT':
      return modify(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    case 'DELETE':
      return unregister(method, pathname, params, (response) => {
        process.nextTick(cb, res, response);
      });
    default:
      // 정의되지 않은 메서드면 null 리턴
      return process.nextTick(cb, res, null);
  }
}

function register (method, pathname, params, cb) {
  let parameters = params.data;
  let response = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };

  redis.get(params.authorization, function (err, data) {
    let userInfo = JSON.parse(data);
    console.log(userInfo);

    if (!parameters.title || !parameters.contents) {
      response.errorcode = 1;
      response.errormessage = 'Invalid Parameters';
      cb(response);
    }

    let newQuest = new Quest({
      userId: userInfo['_id'],
      title: parameters.title,
      contents: parameters.contents,
      tags: parameters.tags,
      powerExp: parameters.powerExp,
      staminaExp: parameters.staminaExp,
      knowledgeExp: parameters.knowledgeExp,
      relationExp: parameters.relationExp
    });
    newQuest.save(function (err, quest) {
      if (err) {
        response.errorcode = 1;
        response.errormessage = err;
        cb(response);
      }

      if (quest) {
        response.results = quest;
        cb(response)
      } else {
        response.errorcode = 1;
        response.errormessage = 'Failed to save Quest Information';
        cb(response);
      }
    });
  });
}

function modify (method, pathname, params, cb) {
  let parameters = params.data;
  let response = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };

  Quest.findByIdAndUpdate(parameters['_id'], parameters, function (err, quest) {
    if (err) {
      response.errorcode = 1;
      response.errormessage = err;
      cb(response);
    }

    if (quest) {
      response.results = quest;
      cb(response);
    } else {
      response.errorcode = 1;
      response.errormessage = 'Failed to update quest information';
      cb(response);
    }
  });
}

function inquiry (method, pathname, params, cb) {
  let parameters = params.data;
  let response = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };

  redis.get(params.authorization, function (err, data) {
    let userInfo = JSON.parse(data);

    Quest.find({ userId: userInfo['_id'] }, function (err, quest) {
      if (err) {
        response.errorcode = 1;
        response.errormessage = err;
        cb(response);
      }

      if (quest.length == 0) {
        response.errorcode = 1;
        response.errormessage = 'no data';
        cb(response);
      } else {
        let query = Quest.find();
        query.exec(function (err, quests) {
          console.log(err);
          let reduceVal = { powerExp: 0, staminaExp: 0, knowledgeExp: 0, relationExp: 0 };
          quests.forEach(function (quest) {
            reduceVal.powerExp += quest.powerExp;
            reduceVal.staminaExp += quest.staminaExp;
            reduceVal.knowledgeExp += quest.knowledgeExp;
            reduceVal.relationExp += quest.relationExp;
          });

          response.chartSeries = reduceVal;
          response.results = quest;
          cb(response);
        });
        // response.results = quest;
        // cb(response);
      }
    });
    // TODO :: Mongodb MapReduce를 활용하여 차트데이터 산출 - free tire에서는 mapReduce를 지원하지 않음
    // let o = {};
    // o.map = function () {
    //   emit(this.userId, this);
    // };
    //
    // o.reduce = function (userId, quests) {
    //   let reduceVal = { powerExp: 0, staminaExp: 0, knowledgeExp: 0, relationExp: 0 };
    //   quests.forEach(function (quest) {
    //     reduceVal.powerExp += quest.powerExp;
    //     reduceVal.staminaExp += quest.staminaExp;
    //     reduceVal.knowledgeExp += quest.knowledgeExp;
    //     reduceVal.relationExp += quest.relationExp;
    //   });
    //
    //   return reduceVal;
    // };
    //
    // Quest.mapReduce(
    //   o,
    //   function (err, results) {
    //     if (err) console.log(err);
    //     console.log(results);
    //   }
    // );
  });
}

function unregister (method, pathname, params, cb) {
  let parameters = params.data;
  var response = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };

  Quest.findByIdAndRemove(parameters['id'], function (err, quest) {
    if (err) {
      response.errorcode = 1;
      response.errormessage = err;
      cb(response);
    }

    cb(response);
  });
}
