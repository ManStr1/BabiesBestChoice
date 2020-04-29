
async function fetchExam2() {
    var i = await fetchExam();
    i = i.replace("{\"ip\":\"", "");
    i = i.replace("\"}", "");
    document.getElementById("myip").value = i;
    

}
            
async function fetchExam() {
    try {
        const response = await fetch(`https://api.ipify.org/?format=json`, {
            method: 'GET',
            credentials: 'same-origin'
        });
        const exam = await response.text();
        return exam;
    } catch (error) {
        console.error(error);
    }
}

fetchExam2();