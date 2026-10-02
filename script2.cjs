const fs = require('fs');
let text = fs.readFileSync('src/components/vademecum/ArtigoBottomSheet.tsx', 'utf8');

// We need to swap the content of <TabsContent value="termos"> and <Sheet open={showHistoricoSheet}>
// Let's use string manipulation because regex for nested tags is hard.

const tabContentStartStr = '<TabsContent value="termos" className="px-5 pb-[calc(8rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-4">';
const tabContentStartIndex = text.indexOf(tabContentStartStr);

// Find the matching closing </TabsContent>
let tabContentEndIndex = -1;
let openCount = 1;
let i = tabContentStartIndex + tabContentStartStr.length;
while(i < text.length) {
    if (text.startsWith('<TabsContent', i)) openCount++;
    if (text.startsWith('</TabsContent>', i)) {
        openCount--;
        if (openCount === 0) {
            tabContentEndIndex = i;
            break;
        }
    }
    i++;
}

const tabContentBody = text.substring(tabContentStartIndex + tabContentStartStr.length, tabContentEndIndex);

const sheetStartStr = '<Sheet open={showHistoricoSheet} onOpenChange={(open) => setShowHistoricoSheet(open)}>';
const sheetStartIndex = text.indexOf(sheetStartStr);

let sheetEndIndex = -1;
openCount = 1;
i = sheetStartIndex + sheetStartStr.length;
while(i < text.length) {
    if (text.startsWith('<Sheet ', i) || text.startsWith('<Sheet>', i)) openCount++;
    if (text.startsWith('</Sheet>', i)) {
        openCount--;
        if (openCount === 0) {
            sheetEndIndex = i;
            break;
        }
    }
    i++;
}

// Extract the content inside the sheet content div
// Wait, inside the Sheet, there is <SheetContent ...> <div className="flex-1 ..."> ... </div> </SheetContent>
// Let's just swap the actual bodies we care about.

// The tabContentBody contains the historico logic.
// The sheet contains the Termos logic (and headers).

// Let's just manually replace the chunks with string replace. It's safer.
