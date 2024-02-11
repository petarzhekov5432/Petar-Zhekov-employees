Vue.component('uploader', {
  template: `<div>
    <input type="file" @change="handleFileUpload" accept=".csv" placeholder="Select a CSV">
    <p v-if="csvData.length > 0">The data below is from the uploaded file.</p>
	<ul>
      <li v-for="row in csvData" style="list-style-type: none;">{{ row }}</li>
    </ul>
    <div v-if="isFileLoaded">
    	<p>Press the button below to load the table with synthesized information.</p>
    	<button @click="processData">Process</button>
		</div>
		<table v-if="isFileLoaded && maxTimeDifferenceEmpIDs" style="border-collapse: collapse; border: 1px solid black;">
			<thead>
        <tr>
          <th>Employee ID #1</th>
          <th>Employee ID #2</th>
          <th>Project ID</th>
          <th>Days worked</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(empIDs, projectID) in maxTimeDifferenceEmpIDs" :key="projectID">
          <td>{{ empIDs }}</td>
          <td>{{ projectID[0].EmpID }}</td>
          <td>{{ projectID[1].EmpID }}</td>
          <td>{{ 
          Math.min(
            projectID[1].TimeDifferenceInDays,
            projectID[0].TimeDifferenceInDays
          )
        }}</td>
          
        </tr>
      </tbody>
      </table>
  </div>`,
  data() {
    return {
      csvData: [],
      isFileLoaded: false,
      maxTimeDifferenceEmpIDs: null,
      lastConsoleLog: '',
    };
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.type === 'text/csv') {
          this.readFile(file);
          this.isFileLoaded = true;
        } else {
          alert('Only CSV.');
        }
      }
    },
    readFile(file) {
      const reader = new FileReader();
      reader.onload = event => {
        const csvData = event.target.result;
        this.csvData = csvData.split('\n').map(row => row.trim());
      };
      reader.readAsText(file);
    },
    findMinTimeDifference(empIDs) {
      let minTimeDifference = Infinity;
      empIDs.forEach(empID => {
        minTimeDifference = Math.min(
          minTimeDifference,
          empID.TimeDifferenceInDays
        );
      });

      return minTimeDifference === Infinity ? 'N/A' : minTimeDifference;
    },
    processData() {
      const dataString = this.csvData.join('\n');
      const data = parseData(dataString);
      data.forEach(obj => {
        if (obj.DateTo === 'null') {
          obj.DateTo = new Date().toISOString().split('T')[0];
        }
      });
      const projectIDCounts = data.reduce((acc, current) => {
        const key = current.ProjectID;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const repeatedProjectIDs = Object.keys(projectIDCounts).filter(
        projectID => projectIDCounts[projectID] > 1
      );

      const repeatedObjects = data.filter(obj =>
        repeatedProjectIDs.includes(obj.ProjectID.toString())
      );

      const timeDifferencesInDays = repeatedObjects.map(obj => {
        const startDate = new Date(obj.DateFrom);
        const endDate = obj.DateTo
          ? new Date(obj.DateTo)
          : new Date().toISOString().split('T')[0];

        const differenceInMilliseconds =
          new Date(endDate) - new Date(startDate);

        const differenceInDays = Math.floor(
          differenceInMilliseconds / (1000 * 60 * 60 * 24)
        );

        return {
          EmpID: obj.EmpID,
          ProjectID: obj.ProjectID,
          DateTo: obj.DateTo,
          TimeDifferenceInDays: isNaN(differenceInDays) ? 0 : differenceInDays, // Промени тук
        };
      });

      const groupedByProjectID = timeDifferencesInDays.reduce((acc, obj) => {
        const { ProjectID, EmpID, TimeDifferenceInDays } = obj;
        if (!acc[ProjectID]) {
          acc[ProjectID] = [];
        }
        acc[ProjectID].push({ EmpID, TimeDifferenceInDays });
        return acc;
      }, {});

      const maxTimeDifferenceEmpIDs = {};
      for (const ProjectID in groupedByProjectID) {
        const empIDs = groupedByProjectID[ProjectID];
        empIDs.sort((a, b) => b.TimeDifferenceInDays - a.TimeDifferenceInDays);
        maxTimeDifferenceEmpIDs[ProjectID] = empIDs.slice(0, 2);
      }

      this.maxTimeDifferenceEmpIDs = maxTimeDifferenceEmpIDs;
      // alert(JSON.stringify(this.maxTimeDifferenceEmpIDs));
      this.lastConsoleLog = JSON.stringify(this.maxTimeDifferenceEmpIDs);
    },
  },
});

var vm = new Vue({
  el: '#app',
});

function parseData(dataString) {
  const lines = dataString.trim().split('\n');
  const headers = lines.shift().split(',');
  const dataArray = lines.map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index].trim();
    });
    return obj;
  });
  return dataArray;
}
