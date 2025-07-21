/* 匯入班級名單功能、權重表格、自動儲存 */

function handleExcelImport() {
  const fileInput = document.getElementById("excelInput");
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const [headers, ...dataRows] = rows;
    const structuredRows = dataRows.map(row => {
    const obj = {};
    headers.forEach((key, i) => {
      obj[key] = row[i];
    });
    return obj;
  });

    const existing = JSON.parse(localStorage.getItem("gradeData") || "{}");

    let validCount = 0;
    let invalidCount = 0;
    const invalidRows = [];

    structuredRows.forEach((row, index) => {
      const className = row["班級"];
      const name = row["學生"];
      const subject = row["科目"];
      const exam = row["考試名稱"];
      const type = row["考試類型"];
      const score = Number(row["分數"]);

      if (!className || !name || !subject || !exam || !type || isNaN(score)) {
        invalidCount++;
        invalidRows.push({
          row: index + 2,
          缺漏欄位: Object.entries(row)
            .filter(([key, value]) => !value && key !== undefined)
            .map(([key]) => key)
        });
        return;
      }

      if (!existing[className]) {
        existing[className] = { "學生名單": [name], "成績": [] };
      }

      if (!existing[className]["學生名單"].includes(name)) {
        existing[className]["學生名單"].push(name);
      }

      existing[className]["成績"].push({
        學生: name,
        科目: subject,
        考試名稱: exam,
        科目類型: type,
        分數: score,
        上傳時間: new Date().toISOString().split("T")[0]
      });

      validCount++;
    });

    localStorage.setItem("gradeData", JSON.stringify(existing));
    renderClassCards();

    showFloatingMessage(`✅ 成績匯入完成，共儲存 ${validCount} 筆，有 ${invalidCount} 筆未通過`);

    renderImportReport(file.name, validCount, invalidCount, invalidRows);
  };

  reader.readAsArrayBuffer(file);
}

function renderImportReport(filename, validCount, invalidCount, invalidRows) {
  const container = document.getElementById("importReportContainer");
  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "report-card";

  card.innerHTML = `
    <h3>📥 成績匯入檢查報告</h3>
    <p><strong>檔案：</strong> ${filename}</p>
    <p><strong>成功儲存：</strong> ${validCount} 筆</p>
    <p><strong>跳過：</strong> ${invalidCount} 筆</p>
  `;

  if (invalidRows.length > 0) {
    const list = document.createElement("ul");
    list.innerHTML = `<strong>錯誤列：</strong>`;
    invalidRows.forEach(row => {
      const li = document.createElement("li");
      li.textContent = `第 ${row.row} 列：缺少「${row.缺漏欄位.join("、")}」`;
      list.appendChild(li);
    });
    card.appendChild(list);
  }

  container.appendChild(card);
}

function importClassList() {
  const fileInput = document.getElementById("classExcelInput"); // 建議 input 改這個 ID
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // 假設欄位是「學生姓名」
    const studentList = rows.map(row => row["學生姓名"]).filter(Boolean);

    const className = file.name.replace(".xlsx", "").trim();
    const existing = JSON.parse(localStorage.getItem("gradeData") || "{}");

    if (!existing[className]) {
      existing[className] = { "學生名單": studentList, "成績": [] };
    } else {
      existing[className]["學生名單"] = studentList;
      existing[className]["成績"] = existing[className]["成績"] || [];
    }

    localStorage.setItem("gradeData", JSON.stringify(existing));
    alert(`${className} 匯入成功！`);
    // 更新首頁卡片畫面
    if (typeof renderClassCards === "function") {
    renderClassCards();
    }
  };

  reader.readAsArrayBuffer(file);
}

function loadStudentList(className) {
  const raw = localStorage.getItem("gradeData");
  if (!raw) return;

  const data = JSON.parse(raw);
  const studentList = data[className]?.["學生名單"];
  if (!studentList) return;

  const container = document.getElementById("gradeTableContainer");
  container.innerHTML = ""; // 清空舊畫面

  // 建立輸入表格
  const table = document.createElement("table");
  table.className = "grade-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th>學生</th>
      <th>考試名稱</th>
      <th>科目</th>
      <th>考試類型</th>
      <th>分數</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  studentList.forEach(name => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${name}</td>
      <td><input type="text" /></td>
      <td>
        <select>
          <option>聽力與口說</option>
          <option>KK音標</option>
          <option>閱讀</option>
        </select>
      </td>
      <td>
        <select>
          <option value="平時考">平時考</option>
          <option value="大考">大考</option>
        </select>
      </td>
      <td><input type="number" min="0" max="100" /></td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  // 加入儲存按鈕
  const btn = document.createElement("button");
  btn.textContent = "儲存成績";
  btn.className = "fancy-button";
  btn.onclick = () => saveGrades(className, table);
  container.appendChild(btn);
}

function saveGrades(className, table) {
  const raw = localStorage.getItem("gradeData") || "{}";
  const data = JSON.parse(raw);
  const records = [];

  const rows = table.querySelectorAll("tbody tr");
  let hasInvalid = false;

  rows.forEach(row => {
    const name = row.cells[0].textContent;
    const exam = row.cells[1].querySelector("input").value.trim();
    const subject = row.cells[2].querySelector("select").value;
    const subjectType = row.cells[3].querySelector("select").value;
    const score = Number(row.cells[4].querySelector("input").value);

    if (!exam || !subject || !subjectType || isNaN(score)) {
      hasInvalid = true;
      return;
    }

    records.push({
      學生: name,
      考試名稱: exam,
      科目: subject,
      科目類型: subjectType,
      分數: score,
      上傳時間: new Date().toISOString().split("T")[0]
    });
  });

  if (records.length === 0) {
    showFloatingMessage("❌ 請確認所有欄位皆已填寫", false);
    return;
  }

  data[className]["成績"] = [...(data[className]["成績"] || []), ...records];
  localStorage.setItem("gradeData", JSON.stringify(data));

  showFloatingMessage(`✅ 已儲存 ${records.length} 筆成績`);
  renderSemesterScoreCard(className); // 更新學期加權卡片

  const timeDisplay = document.getElementById("lastUpdateTime");
  if (timeDisplay) {
    timeDisplay.textContent = `最後更新：${new Date().toLocaleString()}`;
  }

  const currentMonth = getCurrentMonth();
  const currentStudent = document.getElementById("studentSelect")?.value;

  populateStudentList(className, currentMonth); // ✅ 重建學生選單
  if (currentStudent) {
    previewReportCard(currentStudent, className, currentMonth); // ✅ 預覽更新
  }
  
}

function checkWeightTotal() {
  const rows = document.querySelectorAll(".weight-table tbody tr");
  const weights = {};
  let total = 0;

  rows.forEach(row => {
    const subject = row.cells[0].textContent;
    const examInput = row.cells[1].querySelector("input");
    const quizInput = row.cells[2].querySelector("input");

    const examWeight = Number(examInput.value) || 0;
    const quizWeight = Number(quizInput.value) || 0;

    weights[subject] = {
      "大考": examWeight,
      "平時考": quizWeight
    };

    total += examWeight + quizWeight;
  });

  // ✅ 更新畫面提示
  const status = document.getElementById("weight-total");
  status.textContent = `🔍 權重總和：${total} / 100 ${total === 100 ? "✅" : "❌"}`;
  status.style.color = total === 100 ? "#339933" : "#CC3333";

  // ✅ 寫入 localStorage
  localStorage.setItem("subjectWeights", JSON.stringify(weights));
}

function showFloatingMessage(text, success = true) {
  const msg = document.createElement("div");
  msg.textContent = text;
  msg.className = `floating-message ${success ? "success" : "error"}`;
  document.body.appendChild(msg);

  setTimeout(() => {
    msg.remove();
  }, 3000);
}

function loadSubjectWeights() {
  const saved = JSON.parse(localStorage.getItem("subjectWeights") || "{}");
  const rows = document.querySelectorAll(".weight-table tbody tr");

  rows.forEach(row => {
    const subject = row.cells[0].textContent;
    const examInput = row.cells[1].querySelector("input");
    const quizInput = row.cells[2].querySelector("input");

    if (saved[subject]) {
      examInput.value = saved[subject]["大考"] || 0;
      quizInput.value = saved[subject]["平時考"] || 0;
    }
  });

  checkWeightTotal(); // 重新顯示總和與儲存
}

document.querySelectorAll(".weight-table input").forEach(input => {
  input.addEventListener("input", checkWeightTotal);
});

document.addEventListener("DOMContentLoaded", () => {
  loadSubjectWeights();
});

const container = document.getElementById("gradeTableContainer");