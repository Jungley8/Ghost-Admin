import Component from '@ember/component';
import {computed} from '@ember/object';
import {equal, reads} from '@ember/object/computed';
import {isBlank} from '@ember/utils';
import {observer} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default Component.extend({
    classNames: ['view-container'],
    classNameBindings: ['isMobile'],

    mediaQueries: service(),

    tags: null,
    selectedTag: null,

    isMobile: reads('mediaQueries.maxWidth600'),
    isEmpty: equal('tags.length', 0),

    init() {
        this._super(...arguments);
        run.schedule('actions', this, this.fireMobileChangeActions);
    },

    displaySettingsPane: computed('isEmpty', 'selectedTag', 'isMobile', function () {
        let isEmpty = this.get('isEmpty');
        let selectedTag = this.get('selectedTag');
        let isMobile = this.get('isMobile');

        // always display settings pane for blank-slate on mobile
        if (isMobile && isEmpty) {
            return true;
        }

        // display list if no tag is selected on mobile
        if (isMobile && isBlank(selectedTag)) {
            return false;
        }

        // default to displaying settings pane
        return true;
    }),

    fireMobileChangeActions: observer('isMobile', function () {
        if (!this.get('isMobile')) {
            this.sendAction('leftMobile');
        }
    })
});
