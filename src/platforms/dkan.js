import _ from 'lodash';
import config from 'config';
import Rx from 'rxjs';
import log4js from 'log4js';
import { RxHR } from '@akanass/rx-http-request';
import { getDB } from '../database';
import { toUTC } from '../utils/pg-util';
import { wktToGeoJSON } from '../utils/geom-util';

const userAgents = config.get('harvester.user_agents');
const logger = log4js.getLogger('DKAN');

/**
 * Get a list of harvesting jobs.
 * @return {Rx.Observable}        harvest job
 */
export function downloadAll() {

  let sql = `
    SELECT portal.id, portal.name, portal.url FROM portal
    LEFT JOIN platform ON platform.id = portal.platform_id
    WHERE platform.name = $1::text
  `;

  return getDB()
    .query(sql, ['DKAN'])
    .concatMap((portal) => download(portal.id, portal.name, portal.url));
}

/**
 * Harvest a DKAN portal.
 * @param   {String}      name  portal name
 * @return  {Observable}        a stream of dataset metadata
 */
export function downloadPortal(name) {
  let sql = `
    SELECT p.id, p.name, p.url FROM portal AS p
    LEFT JOIN platform AS pl ON pl.id = p.platform_id
    WHERE p.name = $1::text AND pl.name = $2::text
    LIMIT 1
  `;

  return getDB()
    .query(sql, [name, 'DKAN'])
    .concatMap((row) => download(row.id, row.name, row.url));
}

/**
 * Harvest the given DKAN portal.
 * @param  {Number}             portalID    portal ID
 * @param  {String}             portalName  portal name
 * @param  {String}             portalUrl   portal URL
 * @return {Rx.Observable}                  harvest job
 */
export function download(portalID, portalName, portalUrl) {
  return RxHR.get(`${portalUrl}/data.json`, {
    json: true,
    headers: {
      'User-Agent': _.sample(userAgents)
    }
  })
  .concatMap((result) => {

    if (_.isString(result.body)) {
      throw new Error(`Invalid API response: ${portalUrl}/data.json`);
    }

    let data = _.isArray(result.body) ? result.body : result.body.dataset;
    let datasets = [];

    for (let j = 0, m = data.length; j < m; j++) {
      let dataset = data[j];

      if (!dataset.title || dataset.title === 'Data Catalog') {
        continue;
      }

      let dataFiles = _.map(dataset.distribution, (file) => {
        return {
          name: file.title || file.format,
          format: _.toLower(file.format),
          link: file.downloadURL || file.accessURL,
          description: file.description
        };
      })
      .filter((file) => file.link && file.format);

      datasets.push({
        portalID: portalID,
        name: dataset.title,
        portalDatasetID: dataset.identifier,
        createdTime: dataset.issued ? toUTC(new Date(getDateString(dataset.issued))) : null,
        updatedTime: toUTC(dataset.modified ? new Date(getDateString(dataset.modified)) : new Date()),
        description: dataset.description,
        portalLink: dataset.landingPage || `${portalUrl}/search/type/dataset?query=${_.escape(dataset.title.replace(/ /g, '+'))}`,
        license: dataset.license,
        publisher: dataset.publisher ? dataset.publisher.name : portalName,
        tags: dataset.keyword || [],
        categories: [],
        raw: dataset,
        region: wktToGeoJSON(dataset.spatial),
        data: dataFiles
      });
    }

    return Rx.Observable.of(...datasets);
  })
  .catch((error) => {
    logger.error(`Unable to download data from ${portalUrl}. Message: ${error.message}.`);
    return Rx.Observable.empty();
  });
}

function getDateString(raw) {
  if (raw.match(/\d{4}-\d{2}-\d{2}/)) {
    return raw;
  }

  let match = raw.search(/\d{2}\/\d{2}\/\d{4}/);

  if (match > -1) {
    return raw.substr(match, 10);
  }
}
