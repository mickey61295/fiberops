/*;===========================================   
; Author           :  Global Software's    
; Create date      :  25/12/2023    
; Create By        :  ASLAM  
; Description      :  QUERY
; Change Person    :  ASLAM
; Last Change Date :  04/05/2024 10.45 AM 
; ============================================  */  

CREATE PROCEDURE SP_ORD_GRNSTATUS (@OrdId Int,@DeptID INT,@StockID Int,@DCID INT,@WOID INT) As 

DECLARE @KGS AS NUMERIc(18,3)
DECLARE @FabID int,@CntID Int,@ColID Int,@GSM INT,@GG Int,@LL Varchar(15),@DIAID INT,@FinDiaID INT,@FGSM Int,@LotNo Varchar(20)
DECLARE @ActGsm INT,@ActDiaId INT,@PrgKnitGsm INT, @PrgKnitDiaId INT,@PRINT_DESIGNID INT,@SubPrsID INT
DECLARE @DyeDeptGlg Char(1)
DECLARE @DCode int
DECLARE @DyeColID INT
DECLARE @InputType CHAR(1),@OutPutType CHAR(1)
DECLARE @BUDAMT Numeric(18,2)

SELECT @DyeColID = DyeColID FROM Trs_Del1 WHERE ID= @DCID
SELECT @InputType  = InputType from Mas_Dept Where DeptID = @DeptID
SELECT @OutputType  = OutputType from Mas_Dept Where DeptID = @DeptID

SELECT @DCode = isnull(DeptGrpCode,0) From mas_Dept Where DeptId=@DeptID 

IF @DCode = 8 OR @DeptID =8
SET @DyeDeptGlg = 'Y'
ELSE
SET @DyeDeptGlg = 'N'

SELECT @FABID = FABID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @CNTID = CNTID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @COLID = COLID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @GG = GG FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @LL = LL FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @DIAID = DiaID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @FINDIAID = FINDIAID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @GSM = GSM FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @FGSM = FinGsm FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @LotNo = LotNo FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @ActGsm = ActGsm FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @ACTDIAID = ActDiaId FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @PrgKnitGsm = PrgKnitGsm FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @PrgKnitDiaId = PrgKnitDiaId FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @PRINT_DESIGNID = PRINT_DESIGNID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 
SELECT @SubPrsID = SubPrsID FROM STOCKTABLE WHERE ORDID= @ORDID AND Dept = @DeptID 


if @OutPutType ='Y'
BEGIN
SELECT @KGS  = IsNull(SUM(RECKGS),0) FROM TRS_GRN1 A INNER JOIN TRS_GRN2 B ON A.ID = B.ID WHERE Ordid =@OrdID AND DEPT = @DEPTID AND DCID = @DCID 
AND STOCKID = @STOCKID AND GRNTYPE = 'Purchase'


SELECT @BUDAMT = IsNull(SUM(RECKGS),0) * Avg(D.Rate) FROM TRS_GRN1 A INNER JOIN TRS_GRN2 B ON A.ID = B.ID INNER JOIN StockTable C ON B.StockID = C.StockID 
INNER JOIN Pro_ReqYarn2 D ON B.ordid = D.OrdId And C.CntID = D.CountId And C.ColID = D.ColId And D.DeptId = A.Dept
 WHERE B.Ordid =@OrdID AND A.DEPT = @DEPTID AND GRNTYPE = 'Purchase'
END
ELSE
BEGIN

SELECT @KGS  = IsNull(SUM(RECKGS),0) FROM TRS_GRN1 A INNER JOIN TRS_GRN2 B ON A.ID = B.ID WHERE Ordid =@OrdID AND DEPT = @DEPTID AND DCID = @DCID 
AND STOCKID = @STOCKID AND GRNTYPE = 'Process'


SELECT @BUDAMT = IsNull(SUM(RECKGS),0) * Avg(D.Rate) FROM TRS_GRN1 A INNER JOIN TRS_GRN2 B ON A.ID = B.ID INNER JOIN StockTable C ON B.StockID = C.StockID 
INNER JOIN Pro_ReqKnitt2 D ON B.ordid = D.OrdId AND C.FabID = D.FabId And C.CntID = D.CntID And C.ColID = D.ColId 
AND D.GSM = C.Gsm AND D.GG = C.GG AND D.LL = C.ll AND D.DiaID = C.DiaID AND D.FinDiaId = C.FinDiaID AND D.FinGSM = C.FinGsm
AND D.SubPrsID = C.SubPrsID AND D.DesignId = C.PRINT_DESIGNID And D.DeptId = A.Dept
WHERE B.Ordid =@OrdID AND A.DEPT = @DEPTID  AND GRNTYPE = 'Purchase'

END

IF @DyeDeptGlg = 'Y'
BEGIN
UPDATE B SET TOTRECKgs = @Kgs, TOTBudAmt = @BUDAMT FROM TRS_DEL1 A INNER JOIN TRS_DEL2 B ON A.ID = B.ID  INNER JOIN StockTable C ON B.StockID = C.StockID WHERE 
A.ID = @DCID AND B.ORDID = @OrdId
AND FabID = @FabID AND CntID = @CntID AND Gsm = @GSM AND GG= @GG AND LL = @LL AND DiaID = @DIAID AND FinDiaID= @FinDiaID
AND FinGsm = @FGSM AND A.LotNo = @LotNo AND ActGsm = @ActGsm And ActDiaId = @ActDiaId And PrgKnitGsm = @PrgKnitGsm AND PrgKnitDiaId = @PrgKnitDiaId AND PRINT_DESIGNID = @PRINT_DESIGNID AND A.SubPrsID = @SubPrsID 



END 
ELSE
BEGIN
UPDATE TRS_DEL2 SET TOTRECKgs = @Kgs , TOTBudAmt = @BUDAMT FROM TRS_DEL1 A INNER JOIN TRS_DEL2 B ON A.ID = B.ID  INNER JOIN StockTable C ON B.StockID = C.StockID WHERE A.ID = @DCID AND B.ORDID = @OrdId
AND FabID = @FabID AND CntID = @CntID And ColID = @ColID AND Gsm = @GSM AND GG= @GG AND LL = @LL AND DiaID = @DIAID AND FinDiaID= @FinDiaID
AND FinGsm = @FGSM AND C.LotNo = @LotNo AND ActGsm = @ActGsm And ActDiaId = @ActDiaId And PrgKnitGsm = @PrgKnitGsm AND PrgKnitDiaId = @PrgKnitDiaId AND PRINT_DESIGNID = @PRINT_DESIGNID AND A.SubPrsID = @SubPrsID 


END 

