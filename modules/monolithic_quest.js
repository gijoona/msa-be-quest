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
  if (parameters.length > 0) {
    for (let param of parameters) {
      if (param.code == null || param.category == null || param.name == null || param.description == null || param.useyn == null) {
        response.errorcode = 1;
        response.errormessage = 'Invalid Parameters';
      }
    }
    if (response.errorcode == 1) {
      cb(response);
    } else {
      var connection = mysql.createConnection(conn);
      connection.connect();
      connection.query('insert into code(code, category, name, description, useyn) values ?',
        [parameters.map(param => [param.code, param.category, param.name, param.description, param.useyn])],
        (error, results, fields) => {
          if (error) {
            response.errorcode = 1;
            response.errormessage = error;
          } else {  // Redis에 상품 정보 저장
            // const id = results[1][0].id;
            // redis.set(id, JSON.stringify(params));
          }
          cb(response);
        }
      );
      connection.end();
    }
  } else {
    response.errorcode = 1;
    response.errormessage = 'Empty Insert Data';
    cb(response);
  }
}

function modify (method, pathname, params, cb) {
  let parameters = params.data;
  let response = {
    key: params.key,
    errorcode: 0,
    errormessage: 'success'
  };

  if (parameters.length > 0) {
    for (let param of parameters) {
      if (param.id == null || param.code == null || param.category == null || param.name == null || param.description == null || param.useyn == null) {
        response.errorcode = 1;
        response.errormessage = 'Invalid Parameters';
      }
    }
    if (response.errorcode == 1) {
      cb(response);
    } else {
      var connection = mysql.createConnection(conn);
      let querys = '';
      connection.connect();
      for (let param of parameters) {
        querys += `update code set code = '${param.code}', category = '${param.category}', name = '${param.name}', description = '${param.description}', useyn = ${param.useyn} where id = '${param.id}'; `;
      }
      connection.query(querys,
      // connection.query('update code set code = ?, category = ?, name = ?, description = ?, useyn = ? where id = ?',
      // [parameters.map(param => [param.code, param.category, param.name, param.description, param.useyn, param.id])],
      (error, results, fields) => {
        if (error) {
          response.errorcode = 1;
          response.errormessage = error;
        } else {
          // redis.set(params.id, JSON.stringify(params));
        }
        cb(response);
      });
      connection.end();
    }
  } else {
    response.errorcode = 1;
    response.errormessage = 'Empty Modify Data';
    cb(response);
  }
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

  if (parameters.id == null) {
    response.errorcode = 1;
    response.errormessage = 'Invalid Parameters';
    cb(response);
  } else {
    var connection = mysql.createConnection(conn);
    connection.connect();
    connection.query('delete from code where id = ?',
    parameters.id,
    (error, results, fields) => {
      if (error) {
        response.errorcode = 1;
        response.errormessage = error;
      } else {
        redis.del(parameters.id); // Redis에 상품 정보 삭제
      }
      cb(response);
    });
    connection.end();
  }
}
