import './App.css'
import ProductCard from './ProductCard';

function App(){
  return(
    <div>
      <ProductCard name="iPhone DUO" price="500000" img="https://msk.hi-stores.ru/upload/iblock/f7a/liax3gq5vegvf5qoqg6pmng2c6wnb3ko.jpg"/>
      <ProductCard name="Свитшот Stone Island" price="5000" img="https://yesoriginal.com.ua/media/cache/catalog/products/bb/65/da/90094354-2344006-1600x1684_-jpg-84.webp"/>
      <ProductCard name="Iphone 16" price="60000" img="https://www.backmarket.co.uk/cdn-cgi/image/format%3Dauto%2Cquality%3D75%2Cwidth%3D260/https://d2e6ccujb3mkqf.cloudfront.net/ad6dc074-aa15-4f0a-bc2f-a4211fee9aec-1_e1d10d0e-6c08-4e4e-9663-34cabd03b624.jpg"/>
      <ProductCard name="Huawei Matebook D16" price="65000" img="https://img01.huaweifile.com/eu/uk/huawei/pms/uomcdn/GBHW/pms/202501/gbom/6942103142871/800_800_1E706E6D3ED724048E179B08CE1A0144mp.png"/>
      <ProductCard name="Airpods Pro 2" price="20000" img="https://m.media-amazon.com/images/I/61sRKTAfrhL._AC_UF350,350_QL80_.jpg"/>
    </div>
  );
}

// function Welcome(props){
//   return <h1> Привет, {props.name}!</h1>
// }

// function App() {
//   const [message, setMessage] = useState("Нажми кнопку");

//   function handleClick(){
//     setMessage("Кнопка была нажата!");
//   }
//   return(
//     <div>
//       <h1>Привет, React!</h1>
//       <p>Мое первое приложение</p>
//       <Welcome name="Алекс"/>
//       <Welcome name="Мария"/>
      
//       <div>
//         <h1>{message}</h1>
//         <button onClick={handleClick}>Click!</button>
//       </div>
//         <Counter/>
//     </div>
//   )
// }
export default App;