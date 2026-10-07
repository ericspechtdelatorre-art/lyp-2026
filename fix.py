with open('src/scanner/modoA/geometricDeconstruction.ts', 'r') as f:
    code = f.read()
code = code.replace("import { CapturedView, DetectedObjectMetrics } from './spatialTypes';", "import { CapturedView } from './spatialTypes';")
with open('src/scanner/modoA/geometricDeconstruction.ts', 'w') as f:
    f.write(code)
