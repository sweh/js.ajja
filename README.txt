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


Bowerstatic
===========

If you would like to use the bower package of ``gocept.jsform`` and use
Bowerstatic to include your bower resources, you might need to register the
following renderer in order to access the templates required by
``gocept.jsform``::

    def render_template(resource):
    filename = os.path.basename(resource.file_path)
    id_ = os.path.splitext(filename)[0]
    return u'<script type="text/html" id="{}">{}</script>'.format(
        id_, resource.content().decode('UTF-8'))

    bower = bowerstatic.Bower()
    bower.register_renderer('.pt', render_template)


Tests
=====

The tests are written in *jasmine* and run using selenium webdriver.


.. image:: https://builds.gocept.com/job/gocept.jsform/badge/icon
  :target: https://builds.gocept.com/job/gocept.jsform/
