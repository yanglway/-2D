const API = "https://miantong.pythonanywhere.com/api";

let token = localStorage.getItem("token");
let user = JSON.parse(localStorage.getItem("user") || "null");

// 加载首页数据
async function loadData(){
    const r = await fetch(API+"/data").then(x=>x.json());
    document.getElementById("currentNumber").innerText = r.currentNumber;
    document.getElementById("s1").innerText = r.sessions["12:00 PM"].number;
    document.getElementById("s2").innerText = r.sessions["04:30 PM"].number;
    document.getElementById("setVal").innerText = r.set;
    document.getElementById("valVal").innerText = r.val;
}
loadData();
setInterval(loadData, 10000);

// 登录
async function login(u,p){
    const r = await fetch(API+"/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({username:u,password:p})
    }).then(x=>x.json());
    if(r.success){
        user = r;
        localStorage.setItem("user",JSON.stringify(r));
        document.getElementById("balance").innerText = r.balance;
        document.getElementById("balanceBar").style.display = "block";
    }
}

// 投注
document.getElementById("doBet")?.addEventListener("click",async ()=>{
    if(!user){alert("请先登录");return;}
    const r = await fetch(API+"/bet",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            username:user.username,
            number:+document.getElementById("betNumber").value,
            amount:+document.getElementById("betAmount").value,
            session:document.getElementById("betSession").value
        })
    }).then(x=>x.json());
    alert(r.message || (r.success?"投注成功":"投注失败"));
    if(r.success) location.reload();
});
