#!/bin/bash
mkdir -p output output/documents output/ags output/dates output/sp output/teachers
node api/standalone/sp.js
node api/standalone/teacherSp.js
node api/standalone/teachers.js
node api/standalone/documents.js
node api/standalone/ags.js
node api/standalone/dates.js