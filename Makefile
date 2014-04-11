existing_min_js_files = $(patsubst %.js,%.min.js, $(wildcard src/gocept/jsform/resources/*.min.js) )
min_js_files = $(filter-out $(existing_min_js_files), $(patsubst %.js,%.min.js, $(wildcard src/gocept/jsform/resources/*.js) ))

existing_min_css_files = $(patsubst %.css,%.min.css, $(wildcard src/gocept/jsform/resources/*.min.css))
min_css_files = $(filter-out $(existing_min_css_files), $(patsubst %.css,%.min.css, $(wildcard src/gocept/jsform/resources/*.css) $(css_files)))
min_css_files_for_delete = $(filter-out $(existing_min_css_files), $(patsubst %.css,%.min.css, $(wildcard src/gocept/jsform/resources/*.css)))


%.min.js: %.js
	./bin/py -m jsmin $<  > $@

%.min.css: %.css
	./bin/cssmin < $<  > $@

all: $(min_js_files) $(min_css_files)

clean:
	rm -f $(min_js_files) $(min_css_files_for_delete)
