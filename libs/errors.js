'use strict';
let list = {
  '1': {
    'statusCode': 500,
    'title': 'ErrorNotFound',
    'errorMessage': 'El codigo de error %s no se encuentra'
  },
  '100': {
    'statusCode': 400,
    'title': 'OutOfValue',
    'errorMessage': global.__('debe ser %s', global._regex_type_of_fields)
  },
  '101': {
    'statusCode': 400,
    'title': 'MissingOfValue',
    'errorMessage': global.__('debe especificar el valor %s', global._regex_type_of_fields)
  },
  '1000': {
    'statusCode': 401,
    'title': 'ApikeyNotValid',
    'errorMessage': global.__('Apikey inválida o no proporcionada')
  },
  '2000': {
    'statusCode': 404,
    'title': 'ModuleNotFound',
    'errorMessage': global.__('Módulo no existe')
  },
  '2001': {
    'statusCode': 401,
    'title': 'ApikeyNotFound',
    'errorMessage': global.__('apikey no existe')
  },
  '2002': {
    'statusCode': 404,
    'title': 'SpaceNotFound',
    'errorMessage': global.__('Espacio de Trabajo no existe')
  },
  '2003': {
    'statusCode': 400,
    'title': 'ActionOnlyArray',
    'errorMessage': global.__('Acción permitida solo en Array')
  },
  '2004': {
    'statusCode': 404,
    'title': 'DocumentNotFound',
    'errorMessage': global.__('Documento no existe')
  },
  '2005': {
    'statusCode': 400,
    'title': 'DuplicateRecord',
    'errorMessage': global.__('Registro duplicado')
  },
  '2006': {
    'statusCode': 401,
    'title': 'EmailNotFound',
    'errorMessage': global.__('El correo no esta asociado a ningún registro')
  },
  '2007': {
    'statusCode': 401,
    'title': 'EmailOrPasswordNotValid',
    'errorMessage': global.__('Correo o contraseña incorrecta')
  },
  '3000': {
    'statusCode': 400,
    'title': 'transaccionNotAvailable',
    'errorMessage': global.__('Transacciones disponibles solo para módulos tipo general')
  },
  '3001': {
    'statusCode': 400,
    'title': 'transaccionNeedSource',
    'errorMessage': global.__('Transacciones necesitan de un source')
  },
  '10000': {
    'statusCode': 500,
    'title': 'InternalDatabaseError',
    'errorMessage': global.__('Error de base de datos interno')
  },
  '10001': {
    'statusCode': 500,
    'title': 'InternalServerError',
    'errorMessage': global.__('Error de servidor interno')
  }
};

module.exports = (code, res) => {
  let err = list[code];
  if (!err) {
    err = list[code];
    global.__(err.errorMessage, code);
  }
  err.code = parseInt(code);

  if (res) {
    return res.status(err.statusCode).send(err);
  } else {
    return err;
  }
};