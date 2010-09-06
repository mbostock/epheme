JS_COMPILER = \
	java -jar /Library/Google/Compiler/compiler-20100201.jar \
	--warning_level=VERBOSE \
	--charset UTF-8

SRC_FILES = \
	src/start.js \
	src/ns.js \
	src/transform.js \
	src/transform_actions.js \
	src/transform_add.js \
	src/transform_attr.js \
	src/transform_data.js \
	src/transform_remove.js \
	src/transform_select.js \
	src/transform_select_all.js \
	src/transform_style.js \
	src/transform_text.js \
	src/end.js

# TODO
# 	src/dispatch.js \
# 	src/ease.js \
# 	src/transition.js \

all: epheme.js epheme.min.js

epheme.min.js: epheme.js Makefile
	rm -f $@
	$(JS_COMPILER) < epheme.js >> $@

epheme.js: $(SRC_FILES) Makefile
	rm -f $@
	cat $(SRC_FILES) >> $@
	chmod a-w $@

clean:
	rm epheme.js epheme.min.js
