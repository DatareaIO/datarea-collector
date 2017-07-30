import chai from 'chai';
import Rx from 'rxjs';
import _ from 'lodash';
import { download, downloadAll, __RewireAPI__ as ToDosRewireAPI } from '../src/platforms/arcgis';
import { validateMetadata } from './database.test';

const expect = chai.expect;

describe('platfoms/arcgis.js', () => {

  it('downloadAll() should return an observable of dataset stream.', (done) => {
    ToDosRewireAPI.__Rewire__('getDB', () => {
      return {
        query: () => Rx.Observable.create((observer) => {
          observer.next({ id: 1, url: 'testUrl' });
          observer.complete();
        })
      };
    });

    ToDosRewireAPI.__Rewire__('download', () => {
      return Rx.Observable.create((observer) => {
        observer.next([1]);
        observer.complete();
      });
    });

    let requestCount = 0;

    downloadAll()
      .subscribe((data) => {
        expect(data).to.be.an('array');
        requestCount += 1;
      },
      null,
      () => {
        expect(requestCount).to.equal(1);
        done();
      });
  });

  it('download() should return an observable of dataset stream , with provided portal ID and URL.', (done) => {
    ToDosRewireAPI.__Rewire__('RxHR', {
      get: () => {
        return Rx.Observable.of({
          body: {
            dataset: [
              {
                "@type": "dcat:Dataset",
                "identifier": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0",
                "title": "Logan City Bin Collection",
                "description": "The wheelie bin collection dataset contains Logan City Council managed domestic and commercial customer wheelie bin collection day (Monday through Friday) and recycling bin collection week (Week 1 or Week 2) information per property. Excluded from the dataset are bulk/industrial bins (those greater than 240 litres). As a point of reference to calculate future recycling collection frequencies, Week 1 coincides with the week starting Sunday 10/7/2016 and Week 2 coincides with the week starting Sunday 03/07/2016. \n\nThe dataset’s current update frequency is quarterly and may change as Council see fit. Changes to the update frequency will be published as an update to this summary.",
                "keyword": [
                  "Environment",
                  " Waste",
                  " Bin Collection",
                  " LCC Open Data",
                  " Logan City Council",
                  " Rubbish"
                ],
                "issued": "2017-03-08T03:43:57.000Z",
                "modified": "2017-05-16T19:01:31.096Z",
                "publisher": {
                  "name": "Logan City Council"
                },
                "contactPoint": {
                  "@type": "vcard:Contact",
                  "fn": "Sebastien Martin",
                  "hasEmail": "mailto:council@logan.qld.gov.au"
                },
                "accessLevel": "public",
                "distribution": [
                  {
                    "@type": "dcat:Distribution",
                    "title": "ArcGIS Open Dataset",
                    "format": "Web page",
                    "mediaType": "text/html",
                    "accessURL": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0"
                  },
                  {
                    "@type": "dcat:Distribution",
                    "title": "Esri Rest API",
                    "format": "Esri REST",
                    "mediaType": "application/json",
                    "accessURL": "https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/Logan_City_Bin_Collection/FeatureServer/0"
                  },
                  {
                    "@type": "dcat:Distribution",
                    "title": "GeoJSON",
                    "format": "GeoJSON",
                    "mediaType": "application/vnd.geo+json",
                    "downloadURL": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0.geojson"
                  },
                  {
                    "@type": "dcat:Distribution",
                    "title": "CSV",
                    "format": "CSV",
                    "mediaType": "text/csv",
                    "downloadURL": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0.csv"
                  },
                  {
                    "@type": "dcat:Distribution",
                    "title": "KML",
                    "format": "KML",
                    "mediaType": "application/vnd.google-earth.kml+xml",
                    "downloadURL": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0.kml"
                  },
                  {
                    "@type": "dcat:Distribution",
                    "title": "Shapefile",
                    "format": "ZIP",
                    "mediaType": "application/zip",
                    "downloadURL": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0.zip"
                  }
                ],
                "landingPage": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0",
                "webService": "https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services/Logan_City_Bin_Collection/FeatureServer/0",
                "license": "http://data-logancity.opendata.arcgis.com/datasets/4ac9cadfa957477ebc60de72e351e359_0/license.json",
                "spatial": "152.90399692296361,-27.936223092440294,153.2864397057137,-27.58739784984665",
                "theme": [
                  "geospatial"
                ]
              }
            ]
          }
        });
      }
    });

    download({ id: 1, url: 'test' })
      .subscribe((dataset) => {
        validateMetadata(dataset);
      }, _.noop, () => done());
  });

});
