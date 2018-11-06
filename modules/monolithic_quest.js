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
      code: 코드
      category: '코드 카테고리',
      name: '코드명',
      description: '코드 설명',
      useyn: '사용여부'
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
      id: 코드아이디
      code: 코드,
      category: 코드 카테고리,
      name: 코드명,
      description: 코드 설명,
      useyn: 사용여부
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
      useyn: 사용여부
    },
    result: {
      errorcode: '에러코드',
      errormessage: '에러메시지',
      results: [{  //'코드목록'
        id: '고유번호',
        code: 코드,
        category: '코드 카테고리',
        name: '코드명',
        description: '코드 설명'
        useyn: 사용여부
      }, ...]
    }
  }
  퀘스트삭제: {
    method: DELETE,
    url: /quest,
    parameter: {
      id: '코드고유번호'
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
    // TODO :: 퀘스트 저장 기능 개발 중
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
      contents: parameters.contents
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

    Quest.find({ userId: userInfo._id }, function (err, quest) {
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
        response.results = quest;
        cb(response);
      }
    });
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
