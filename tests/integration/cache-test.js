import { dummyModels } from 'dummy/tests/support/dummy-models';
import { createStore } from 'dummy/tests/support/store';

import Orbit from 'orbit';
import { queryExpression as oqe } from 'orbit/query/expression';
const { Planet, Moon, Star } = dummyModels;


module('Integration - Cache', function(hooks) {
  let store;
  let cache;

  hooks.beforeEach(function() {

    // this shouldn't be necessary, however for some reason Orbit.Promise is set to
    // null at a seemingly random point through the cache tests (usually it occurs after 3-5 tests)
    Orbit.Promise = Ember.RSVP.Promise;

    const models = { planet: Planet, moon: Moon, star: Star };
    store = createStore({ models });
    cache = store.get('cache');
  });

  hooks.afterEach(function() {
    store = null;
    cache = null;
  });

  test('liveQuery - adds record that becomes a match', function(assert) {
    store.addRecord({ id: 'jupiter', type: 'planet', attributes: { name: 'Jupiter2' } });
    const liveQuery = cache.liveQuery(q => q.recordsOfType('planet')
                                           .filterAttributes({ name: 'Jupiter' }));

    store.transform(t => t.replaceAttribute({ type: 'planet', id: 'jupiter' }, 'name', 'Jupiter'));

    assert.equal(liveQuery.get('length'), 1);
  });

  test('liveQuery - updates when matching record is added', function(assert) {
    const planets = cache.liveQuery(oqe('recordsOfType', 'planet'));
    const addJupiter = store.addRecord({ id: 'jupiter', type: 'planet', name: 'Jupiter' });
    return addJupiter.then(jupiter => assert.ok(planets.contains(jupiter)));
  });

  test('liveQuery - updates when matching record is removed', function(assert) {
    const done = assert.async();

    Ember.run(() => {
      const planets = cache.liveQuery(oqe('recordsOfType', 'planet'));

      store
        .addRecord({type: 'planet', name: 'Jupiter'})
        .tap(jupiter => store.removeRecord(jupiter))
        .then(jupiter => assert.ok(!planets.contains(jupiter)))
        .then(() => done());
    });
  });

  test('liveQuery - ignores non matching record', function(assert) {
    const done = assert.async();

    Ember.run(() => {
      const planets = cache.liveQuery(oqe('recordsOfType', 'planet'));

      store
        .addRecord({type: 'moon', name: 'Callisto'})
        .then(callisto => assert.ok(!planets.contains(callisto)))
        .then(() => done());
    });
  });

  test('liveQuery - removes record that no longer matches', function(assert) {
    const done = assert.async();

    Ember.run(() => {
      const planets = cache.liveQuery(
        oqe('filter',
          oqe('recordsOfType', 'planet'),
          oqe('equal', oqe('attribute', 'name'), 'Jupiter')));

      store
        .addRecord({type: 'planet', name: 'Jupiter'})
        .tap(jupiter => store.transform(t => t.replaceAttribute(jupiter.getIdentifier(), 'name', 'Jupiter2')))
        .then(jupiter => assert.ok(!planets.contains(jupiter)))
        .then(() => done());
    });
  });


  test('#retrieveAttribute', function(assert) {
    const done = assert.async();

    Ember.run(() => {
      store
        .addRecord({type: 'planet', name: 'Jupiter'})
        .then((jupiter) => {
          assert.equal(cache.retrieveAttribute(jupiter, 'name'), 'Jupiter');
          done();
        });
    });
  });

  test('#retrieve', function(assert) {
    const done = assert.async();

    Ember.run(() => {
      store
        .addRecord({type: 'planet', name: 'Jupiter'})
        .then((jupiter) => {
          assert.equal(cache.retrieve(['planet', jupiter.get('id'), 'attributes', 'name']), 'Jupiter');
          done();
        });
    });
  });

  test('#retrieveHasOne', function(assert) {
    const done = assert.async();

    Ember.run(() => {
      Ember.RSVP.Promise.all([
        store.addRecord({type: 'planet', name: 'Jupiter'}),
        store.addRecord({type: 'moon', name: 'Callisto'})
      ])
      .tap(([jupiter, callisto]) => {
        callisto.set('planet', jupiter);
      })
      .then(([jupiter, callisto]) => {
        assert.equal(cache.retrieveHasOne(callisto, 'planet'), jupiter);
        done();
      });
    });
  });

  test('#retrieveRecord', function(assert) {
    Ember.run(() => {
      store
        .addRecord({type: 'planet', name: 'Jupiter'})
        .then((record) => cache.retrieveRecord('planet', record.get('id')))
        .then((retrievedRecord) => assert.ok(retrievedRecord, 'retrieved record'));
    });
  });
});
