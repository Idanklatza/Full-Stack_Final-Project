import {
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Button,
  Image,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { useState, useEffect, useContext } from "react";
import RadioGroup from "react-native-radio-buttons-group";
import { ScrollView } from "react-native";
import Menu from "../components/Menu";
import { useNavigation } from "@react-navigation/native";
import DatePicker from "react-native-datepicker";
import { Calendar } from "react-native-calendars";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserContext } from "../UserContext";
import axios from "axios";
import { ip } from "@env";
export default function BuildTripScreen() {
  const navigation = useNavigation();
  const [hotel, setHotel] = useState("");
  const [location, setLocation] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedType, setSelectedType] = useState([]);
  const [icon, setIcon] = useState(require("../assets/markIcon/question.png"));
  const [message, setMessage] = useState("");
  const [inboundDate, setInboundDate] = useState(null);
  const [outboundDate, setOutboundDate] = useState(null);
  const today = new Date().toISOString().split("T")[0];
  const [dateRange, setDateRange] = useState([]);
  const [numberDays, setnumberDays] = useState(0);
  const { userDetails, setUserDetails } = useContext(UserContext);
  let findHotel = false;
  //search btn
  function buildTrip(selectedType, location) {
    if (
      outboundDate != null &&
      inboundDate != null &&
      location != "" &&
      selectedOption != "" &&
      diff <= 7 &&
      selectedType.length > 0
    ) {
      setMessage("");
      NearByAPI(selectedType, location);
    } else if (diff > 7) {
      setMessage("A trip should be a maximum of 7 days");
    } else {
      setMessage("Please full all the filed");
    }
  }

  const calculateDateDifference = () => {
    const date1 = new Date(inboundDate);
    const date2 = new Date(outboundDate);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    if (inboundDate && outboundDate) {
      const range = getDatesBetween(
        new Date(inboundDate),
        new Date(outboundDate)
      );
      setDateRange(range);
    }
  }, [inboundDate, outboundDate]);

  async function findMaxItem(ItemList) {
    const maxRatingItem = ItemList.reduce((maxItem, currentItem) => {
      if (currentItem.rating > maxItem.rating) {
        return currentItem;
      }
      return maxItem;
    });
    return maxRatingItem;
  }

  async function startingAttraction(filteredDataList1) {
    const mapCalender = new Map(); // Map => (numday , [attractionArray])
    let daysKeyArrays = [];
    let maxItem; // Item with max rating
    let numDays = calculateDateDifference(); // Number of days
    let attractionTypesCounter = new Array(selectedType.length).fill(1);
    let extraAttractionArr = [];
    let filteredDataList = filteredDataList1;

    for (let i = 0; i < numDays + 1; i++) {
      daysKeyArrays = [];
      attractionTypesCounter = new Array(selectedType.length).fill(1);

      for (let j = 0; j < 5; j++) {
        let allZero = attractionTypesCounter.every((count) => count === 0);
        let attractionAddingChecker = false;

        if (!allZero) {
          let flag = 0;
          while (!attractionAddingChecker) {
            maxItem = findMaxItem(filteredDataList);
            let objItem = Object.values(maxItem)[2]; // Get the object

            for (let i = 0; i < selectedType.length; i++) {
              if (objItem.types.includes(selectedType[i]) && attractionTypesCounter[i] !== 0) {
                attractionTypesCounter[i] = 0;
                daysKeyArrays.push(objItem);
                console.log(`Attraction Adding Type is: ${objItem.name} on index number ${j}`);
                attractionAddingChecker = true;
                flag = 1;
                break;
              }
            }

            if (flag === 0) {
              console.log(`${objItem.name} Adding to Extra on index number ${j}`);
              extraAttractionArr.push(objItem);
              filteredDataList = filteredDataList.filter((item) => item.place_id !== objItem.place_id);
            }
          }
        } else {
          if (extraAttractionArr.length !== 0) {
            let variable = extraAttractionArr.pop();
            daysKeyArrays.push(variable);
            console.log(`Extra Adding Type from the if is: ${variable.types}`);
          } else {
            maxItem = findMaxItem(filteredDataList);
            let objItem = Object.values(maxItem)[2];
            daysKeyArrays.push(objItem);
            console.log(`Extra Adding Type from the else is: ${objItem.types}`);
          }
        }

        const updatedDataList = filteredDataList.filter((item) => item.place_id !== daysKeyArrays[j].place_id);
        filteredDataList = updatedDataList;
      }

      mapCalender.set(i, daysKeyArrays);
      daysKeyArrays = [];
    }

    //print the map to the terminal:

    for (let i = 0; i < diff + 1; i++) {
      //console.log("day " + i + ":");
      for (let j = 0; j < 3; j++) {
        // console.log("attra " + j + ":");
        const map = mapCalender.get(i)[j];
        //console.log(mapCalender.get(i)[j]);
      }
    }
    let attractions = {};

    for (let i = 0; i < mapCalender.size; i++) {
      attractions[`day${i + 1}`] = { dailyAttractions: mapCalender.get(i) };
    }

    let oneItem = {
      dates: dateRange,
      attractions: attractions,
      author: userDetails,
      typeAttractions: selectedType,
      hotelLocation: location,
      mobility: selectedOption,
    };
    await axios
      .post(`http://${process.env.ip}:4000/travel/add`, oneItem)
      .then(console.log(typeof oneItem.attractions))
      .catch((error) => {
        if (error.response) {
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          console.log(error.request);
        } else {
          console.log("Error", error.message);
        }
      });
  }

  const getDatesBetween = (start, end) => {
    const dateArray = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
  };

  async function NearByAPI(attractions, location) {
    let userRadius = 100;
    if (selectedOption !== null) {
      if (selectedOption === "walking") {
        userRadius = 1000;
      } else if (selectedOption === "public") {
        userRadius = 5000;
      } else if (selectedOption === "car") {
        userRadius = 10000;
      }

      try {
        const requests = attractions.map((attraction) => {
          return axios.get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            {
              params: {
                location: location,
                radius: userRadius,
                type: attraction,
                key: "AIzaSyBfiFw1fsLgQZ9a3JB_XplnxgO5eeK9b2E",
              },
            }
          );
        });

        const responses = await Promise.all(requests);
        const data = responses.map((response) => response.data.results);
        const allData = data.flat();
        //console.log(allData); //all the data that is send to the details components
        //console.log(allData.map((item) => item.rating)); // all the data that is send to the details components
        //console.log(selectedType); // an array of type's the user selected
        //console.log(dateRange); // an array of dates , //<Text key={date}>{date.toISOString().split("T")[0]}</Text>
        const filteredDataList = allData.filter(
          (item) => item.rating !== undefined
        );
        startingAttraction(filteredDataList);
        clickSearchHandel(filteredDataList);
        // setHotel("");
        setSelectedOption("");
        setSelectedType([]);
        findHotel = false;
        setIcon(require("../assets/markIcon/question.png"));
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function TextAPI(hotel) {
    console.log(await AsyncStorage.getItem("successLogin"));
    axios
      .get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          address: hotel,
          key: "AIzaSyBfiFw1fsLgQZ9a3JB_XplnxgO5eeK9b2E",
        },
      })
      .then(function (response) {
        if (
          response.data &&
          response.data.results &&
          response.data.results[0]
        ) {
          const cordinates = response.data.results[0].geometry.location;
          setLocation(cordinates.lat + "," + cordinates.lng);
          setIcon(require("../assets/markIcon/validationIcon.png"));
          findHotel = true;
          // console.log(location);
        } else {
          // console.error("No results returned from the Geocoding API");
        }
      })
      .catch(function (error) {
        setIcon(require("../assets/markIcon/error.png"));
        //console.error(error);
      });
  }

  const data = [
    {
      label: "Walking",
      value: "walking",
    },
    {
      label: "Public Transport",
      value: "public",
    },
    {
      label: "Car",
      value: "car",
    },
  ];

  function handleOptionSelect(selected) {
    const newSelectedValue = selected.find(
      (item) => item.selected === true
    ).value;
    setSelectedOption(newSelectedValue);
  }
  // , {
  //       mobility: selectedOption,
  //       location: location,
  //     }
  function clickSearchHandel() {
    navigation.navigate("Schedule");
  }

  function changeHotelhandler(event) {
    setHotel(event);
    setLocation("");
    findHotel = false;
    setIcon(require("../assets/markIcon/question.png"));
  }
  const diff = calculateDateDifference();

  return (
    <ImageBackground
      source={require("../assets/BackgroundScreens/newTrip.png")}
      style={styles.backgroundImage}
    >
      <Text style={styles.TitleOut}>Add New Trip</Text>

      <View style={styles.calender}>
        <DatePicker
          customStyles={{
            dateInput: {
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: "#ffff",
              backgroundColor: "#ffff",
              borderColor: "transference",
            },
            datePickerCon: {
              backgroundColor: "#222",
            },
            placeholderText: {
              color: "black",
            },
          }}
          showIcon={false}
          style={styles.datePicker}
          androidMode="calendar"
          date={inboundDate}
          mode="date"
          placeholder="Check-in"
          format="YYYY-MM-DD"
          minDate={today}
          confirmBtnText="Confirm"
          cancelBtnText="Cancel"
          onDateChange={(date) => setInboundDate(date)}
        />
        {console.log(inboundDate + "," + today)}
        <DatePicker
          style={styles.datePicker}
          showIcon={false}
          customStyles={{
            dateInput: {
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: "#ffff",
              backgroundColor: "#ffff",
              borderColor: "transference",
            },
            datePickerCon: {
              backgroundColor: "#222",
            },
            placeholderText: {
              color: "black",
            },
          }}
          androidMode="calendar"
          date={outboundDate}
          mode="date"
          placeholder="Check-out"
          format="YYYY-MM-DD"
          minDate={inboundDate}
          confirmBtnText="Confirm"
          cancelBtnText="Cancel"
          // maxDate={inboundDat}
          onDateChange={(date) => setOutboundDate(date)}
        ></DatePicker>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.errorMessage}>{message}</Text>

          <Text style={styles.text}>Enter Hotel/location:</Text>
          <View style={styles.validHotel}>
            <View style={styles.inputView}>
              <TextInput
                placeholder="Enter hotel name"
                style={styles.TextInput}
                value={hotel}
                placeholderTextColor="#003f5c"
                onChangeText={changeHotelhandler}
              />
              <Image key={"validation"} style={styles.img} source={icon} />
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => TextAPI(hotel)}
            >
              <Text>Find Hotel</Text>
            </TouchableOpacity>
            {/* <Button title="Find Hotel" onPress={() => TextAPI(hotel)} /> */}
          </View>
          {outboundDate != null ? (
            <Text style={{ paddingStart: 10 }}>Number of days: {diff}</Text>
          ) : (
            outboundDate != null
          )}
          <View style={styles.separator} />
          <Text style={styles.text}>Select an option:</Text>
          <Menu selectedType={selectedType} setSelectedType={setSelectedType} />
          <View style={styles.separator} />
          <Text style={styles.text}>mobility:</Text>
          <View style={styles.radioGroupContainer}>
            {data.map((item) => (
              <View key={item.value} style={styles.radioButtonItem}>
                <RadioGroup
                  radioButtons={[item]}
                  onPress={handleOptionSelect}
                  selectedButton={selectedOption === item.value}
                  layout="row"
                />
              </View>
            ))}
          </View>
          <View style={{ marginStart: 140 }}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                buildTrip(selectedType, location);
              }}
            >
              <Text>Search</Text>
            </TouchableOpacity>
          </View>
          {/* <Button
            style={styles.emphasizedButton}
            titleStyle={styles.buttonTitle}
            title="Search"
            onPress={() => {
              buildTrip(selectedType, location);
            }}
          /> */}
          <StatusBar style="auto" />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 100,
    height: 50,
    marginStart: "5%",
    alignItems: "center",
    borderRadius: 20,
    justifyContent: "center",
    color: "#ffff",
    backgroundColor: "#E1E0FB",
  },
  scroll: {
    // marginTop: "0.5%",
  },
  TitleOut: {
    marginTop: 100,
    fontSize: 30,
    marginStart: 10,
    fontWeight: "bold",
    color: "#ffff",
    borderRadius: 10,
    borderColor: "black",
    textShadowRadius: 10,
    textShadowColor: "black",
  },
  container: {
    flex: 1,
  },
  inputView: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EDED",
    borderRadius: 10,
    width: "70%",
    height: 55,
    marginBottom: 20,
  },
  TextInput: {
    flex: 1,
    padding: "2%",
    marginLeft: 20,
  },
  img: {
    margin: 10,
    width: 25,
    height: 25,
    borderRadius: 10,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
  },
  validHotel: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "center",
    padding: 5,
    marginStart: 5,
    marginEnd: 5,
  },
  text: {
    fontSize: 15,
    margin: 10,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 15,
    margin: 10,
  },
  errorMessage: {
    color: "red",
    textAlign: "center",
  },
  radioGroupContainer: {
    marginStart: 5,
    flexDirection: "row",
    marginBottom: 16,
    marginBottom: 50,
  },
  radioButtonItem: {
    marginLeft: 7,
    marginRight: 7,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  calender: {
    flexDirection: "row",
    justifyContent: "center",
    margin: 5,
  },
  calenderTitle: {
    title: {
      marginRight: 102,
    },
    marginLeft: 15,
    flexDirection: "row",
    // width: "50%",
  },
  datePicker: {
    width: "42%",
    padding: 5,
    // color: "#000",
  },
  iconCalander: {
    margin: 10,
    width: 25,
    height: 25,
  },
});
