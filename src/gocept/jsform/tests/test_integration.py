# -*- coding: utf-8 -*-
# Copyright (c) 2013 gocept gmbh & co. kg
# See also LICENSE.txt

import gocept.selenium.static
import os.path
import shutil


class StaticFilesLayer(gocept.selenium.static.StaticFilesLayer):

    def testSetUp(self):
        super(StaticFilesLayer, self).testSetUp()
        # Move our fixtures into the `documentroot`.
        fixtures_root = os.path.join(os.path.dirname(__file__), 'files')
        shutil.rmtree(self['documentroot'])  # `copytree` creates it
        shutil.copytree(fixtures_root, self['documentroot'], symlinks=True)


STATIC_FILES_LAYER = StaticFilesLayer()


class SeleniumTestCase(gocept.selenium.static.TestCase):

    layer = STATIC_FILES_LAYER

    def _run(self, filename):
        sel = self.selenium
        sel.open(filename)
        sel.waitForElementPresent('css=.passingAlert, .failingAlert')
        summary = sel.getText('css=.bar')
        if 'Failing' in summary:
            # XXX: Get all failing test messages (use webdriver)
            message = sel.getText('css=.messages')
            self.fail('{}\n{}'.format(summary, message))

    def test_integration(self):
        self._run('integration.html')
