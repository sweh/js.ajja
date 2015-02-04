======================
Additional information
======================


Fanstatic
=========

If you have a server using *fanstatic* to include resources, just do::

    from gocept.jsform import jsform
    jsform.need()

This will require all needed resources like *jquery*, *knockout*,
*json-template*, widgets and the code to setup and run *gocept.jsform* itself.


Tests
=====

The tests are written in *jasmine* and run using selenium webdriver.


.. image:: https://builds.gocept.com/job/gocept.jsform/badge/icon
  :target: https://builds.gocept.com/job/gocept.jsform/
